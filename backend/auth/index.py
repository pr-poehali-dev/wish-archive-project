import json
import os
import hashlib
import secrets
import psycopg2
from psycopg2.extras import RealDictCursor

def get_db_connection():
    dsn = os.environ.get('DATABASE_URL')
    return psycopg2.connect(dsn)

def hash_password(password: str, salt: str = None) -> tuple:
    if salt is None:
        salt = secrets.token_hex(16)
    pwd_hash = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000)
    return pwd_hash.hex(), salt

def handler(event: dict, context) -> dict:
    '''API для авторизации и регистрации пользователей'''
    method = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    try:
        body = json.loads(event.get('body', '{}'))
        action = body.get('action')
        
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        if action == 'register':
            username = body.get('username', '').strip()
            password = body.get('password', '')
            display_name = body.get('display_name', '').strip()
            
            if not username or not password or not display_name:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Все поля обязательны'}),
                    'isBase64Encoded': False
                }
            
            cur.execute("SELECT id FROM users WHERE username = %s", (username,))
            if cur.fetchone():
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Пользователь уже существует'}),
                    'isBase64Encoded': False
                }
            
            pwd_hash, salt = hash_password(password)
            password_hash = f"{salt}${pwd_hash}"
            
            cur.execute(
                "INSERT INTO users (username, password_hash, display_name) VALUES (%s, %s, %s) RETURNING id, username, display_name",
                (username, password_hash, display_name)
            )
            user = cur.fetchone()
            conn.commit()
            
            session_token = secrets.token_urlsafe(32)
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'success': True,
                    'user': dict(user),
                    'token': session_token
                }),
                'isBase64Encoded': False
            }
        
        elif action == 'login':
            username = body.get('username', '').strip()
            password = body.get('password', '')
            
            if not username or not password:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Укажите логин и пароль'}),
                    'isBase64Encoded': False
                }
            
            cur.execute(
                "SELECT id, username, password_hash, display_name, partner_id FROM users WHERE username = %s",
                (username,)
            )
            user = cur.fetchone()
            
            if not user:
                return {
                    'statusCode': 401,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Неверный логин или пароль'}),
                    'isBase64Encoded': False
                }
            
            stored_hash = user['password_hash']
            salt, pwd_hash = stored_hash.split('$')
            computed_hash, _ = hash_password(password, salt)
            
            if computed_hash != pwd_hash:
                return {
                    'statusCode': 401,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Неверный логин или пароль'}),
                    'isBase64Encoded': False
                }
            
            session_token = secrets.token_urlsafe(32)
            
            partner_name = None
            if user['partner_id']:
                cur.execute("SELECT display_name FROM users WHERE id = %s", (user['partner_id'],))
                partner = cur.fetchone()
                if partner:
                    partner_name = partner['display_name']
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'success': True,
                    'user': {
                        'id': user['id'],
                        'username': user['username'],
                        'display_name': user['display_name'],
                        'partner_id': user['partner_id'],
                        'partner_name': partner_name
                    },
                    'token': session_token
                }),
                'isBase64Encoded': False
            }
        
        elif action == 'link_partner':
            user_id = body.get('user_id')
            partner_username = body.get('partner_username', '').strip()
            
            if not user_id or not partner_username:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Укажите логин партнёра'}),
                    'isBase64Encoded': False
                }
            
            cur.execute("SELECT id, display_name FROM users WHERE username = %s", (partner_username,))
            partner = cur.fetchone()
            
            if not partner:
                return {
                    'statusCode': 404,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Партнёр не найден'}),
                    'isBase64Encoded': False
                }
            
            cur.execute("UPDATE users SET partner_id = %s WHERE id = %s", (partner['id'], user_id))
            cur.execute("UPDATE users SET partner_id = %s WHERE id = %s", (user_id, partner['id']))
            conn.commit()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'success': True,
                    'partner_name': partner['display_name']
                }),
                'isBase64Encoded': False
            }
        
        else:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Неизвестное действие'}),
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
