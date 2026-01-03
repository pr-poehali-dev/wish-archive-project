import json
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime

def get_db_connection():
    dsn = os.environ.get('DATABASE_URL')
    return psycopg2.connect(dsn)

def create_notification(conn, user_id: int, wish_id: int, notification_type: str, message: str):
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO notifications (user_id, wish_id, type, message) VALUES (%s, %s, %s, %s)",
        (user_id, wish_id, notification_type, message)
    )
    cur.close()

def handler(event: dict, context) -> dict:
    '''API для управления желаниями и получения уведомлений'''
    method = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        if method == 'GET':
            params = event.get('queryStringParameters', {}) or {}
            user_id = params.get('user_id')
            action = params.get('action', 'wishes')
            
            if not user_id:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'user_id обязателен'}),
                    'isBase64Encoded': False
                }
            
            if action == 'wishes':
                cur.execute("SELECT partner_id FROM users WHERE id = %s", (user_id,))
                user = cur.fetchone()
                
                if user and user['partner_id']:
                    cur.execute("""
                        SELECT w.*, u.display_name as owner_name,
                               CASE WHEN w.user_id = %s THEN 'me' ELSE 'partner' END as owner
                        FROM wishes w
                        JOIN users u ON w.user_id = u.id
                        WHERE w.user_id IN (%s, %s)
                        ORDER BY w.created_at DESC
                    """, (user_id, user_id, user['partner_id']))
                else:
                    cur.execute("""
                        SELECT w.*, u.display_name as owner_name, 'me' as owner
                        FROM wishes w
                        JOIN users u ON w.user_id = u.id
                        WHERE w.user_id = %s
                        ORDER BY w.created_at DESC
                    """, (user_id,))
                
                wishes = cur.fetchall()
                
                result = []
                for wish in wishes:
                    result.append({
                        'id': wish['id'],
                        'title': wish['title'],
                        'description': wish['description'],
                        'link': wish['link'],
                        'image': wish['image_url'],
                        'owner': wish['owner'],
                        'owner_name': wish['owner_name'],
                        'completed': wish['completed'],
                        'createdAt': wish['created_at'].isoformat() if wish['created_at'] else None
                    })
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'wishes': result}),
                    'isBase64Encoded': False
                }
            
            elif action == 'notifications':
                cur.execute("""
                    SELECT n.*, w.title as wish_title
                    FROM notifications n
                    LEFT JOIN wishes w ON n.wish_id = w.id
                    WHERE n.user_id = %s AND n.is_read = FALSE
                    ORDER BY n.created_at DESC
                    LIMIT 50
                """, (user_id,))
                
                notifications = cur.fetchall()
                
                result = []
                for notif in notifications:
                    result.append({
                        'id': notif['id'],
                        'type': notif['type'],
                        'message': notif['message'],
                        'wish_title': notif['wish_title'],
                        'createdAt': notif['created_at'].isoformat() if notif['created_at'] else None
                    })
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'notifications': result}),
                    'isBase64Encoded': False
                }
        
        elif method == 'POST':
            body = json.loads(event.get('body', '{}'))
            user_id = body.get('user_id')
            title = body.get('title', '').strip()
            description = body.get('description', '').strip()
            link = body.get('link', '').strip()
            image_url = body.get('image', '').strip()
            
            if not user_id or not title:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'user_id и title обязательны'}),
                    'isBase64Encoded': False
                }
            
            cur.execute("""
                INSERT INTO wishes (user_id, title, description, link, image_url)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id
            """, (user_id, title, description, link or None, image_url or None))
            
            wish_id = cur.fetchone()['id']
            
            cur.execute("SELECT partner_id, display_name FROM users WHERE id = %s", (user_id,))
            user = cur.fetchone()
            
            if user and user['partner_id']:
                message = f"{user['display_name']} добавил новое желание: {title}"
                create_notification(conn, user['partner_id'], wish_id, 'new_wish', message)
            
            conn.commit()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'success': True, 'wish_id': wish_id}),
                'isBase64Encoded': False
            }
        
        elif method == 'PUT':
            body = json.loads(event.get('body', '{}'))
            wish_id = body.get('wish_id')
            completed = body.get('completed')
            user_id = body.get('user_id')
            
            if not wish_id or completed is None:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'wish_id и completed обязательны'}),
                    'isBase64Encoded': False
                }
            
            if completed:
                cur.execute("""
                    UPDATE wishes 
                    SET completed = TRUE, completed_at = %s, updated_at = %s
                    WHERE id = %s
                    RETURNING user_id, title
                """, (datetime.now(), datetime.now(), wish_id))
            else:
                cur.execute("""
                    UPDATE wishes 
                    SET completed = FALSE, completed_at = NULL, updated_at = %s
                    WHERE id = %s
                    RETURNING user_id, title
                """, (datetime.now(), wish_id))
            
            wish = cur.fetchone()
            
            if wish and user_id:
                cur.execute("SELECT partner_id, display_name FROM users WHERE id = %s", (user_id,))
                user = cur.fetchone()
                
                if user and user['partner_id'] and user['partner_id'] == wish['user_id']:
                    message = f"{user['display_name']} исполнил ваше желание: {wish['title']}"
                    create_notification(conn, wish['user_id'], wish_id, 'wish_completed', message)
            
            conn.commit()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'success': True}),
                'isBase64Encoded': False
            }
        
        else:
            return {
                'statusCode': 405,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Method not allowed'}),
                'isBase64Encoded': False
            }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)}),
            'isBase64Encoded': False
        }
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()
