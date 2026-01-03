import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';

const AUTH_URL = 'https://functions.poehali.dev/642d3966-f76b-4382-9d3b-f22a4fe39ed1';
const WISHES_URL = 'https://functions.poehali.dev/66dd1f20-bbba-4347-bef9-435059ce431a';

interface User {
  id: number;
  username: string;
  display_name: string;
  partner_id?: number;
  partner_name?: string;
}

interface Wish {
  id: number;
  title: string;
  description: string;
  link?: string;
  image?: string;
  owner: 'me' | 'partner';
  owner_name: string;
  completed: boolean;
  createdAt: string;
}

interface Notification {
  id: number;
  type: string;
  message: string;
  wish_title?: string;
  createdAt: string;
}

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLogin, setIsLogin] = useState(true);
  const [authData, setAuthData] = useState({ username: '', password: '', display_name: '' });
  const [partnerUsername, setPartnerUsername] = useState('');
  const [showPartnerDialog, setShowPartnerDialog] = useState(false);
  const [newWish, setNewWish] = useState({ title: '', description: '', link: '', image: '' });
  const [isWishDialogOpen, setIsWishDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('wishbook_user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      loadWishes(parsedUser.id);
      loadNotifications(parsedUser.id);
    }
  }, []);

  useEffect(() => {
    if (user) {
      const interval = setInterval(() => {
        loadNotifications(user.id);
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const loadWishes = async (userId: number) => {
    try {
      const response = await fetch(`${WISHES_URL}?user_id=${userId}&action=wishes`);
      const data = await response.json();
      if (data.wishes) {
        setWishes(data.wishes);
      }
    } catch (error) {
      console.error('Error loading wishes:', error);
    }
  };

  const loadNotifications = async (userId: number) => {
    try {
      const response = await fetch(`${WISHES_URL}?user_id=${userId}&action=notifications`);
      const data = await response.json();
      if (data.notifications) {
        setNotifications(data.notifications);
        if (data.notifications.length > 0) {
          toast.info(`У вас ${data.notifications.length} новых уведомлений`);
        }
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const handleAuth = async () => {
    if (!authData.username || !authData.password) {
      toast.error('Заполните все поля');
      return;
    }

    if (!isLogin && !authData.display_name) {
      toast.error('Укажите ваше имя');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(AUTH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: isLogin ? 'login' : 'register',
          ...authData
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setUser(data.user);
        localStorage.setItem('wishbook_user', JSON.stringify(data.user));
        toast.success(isLogin ? 'Добро пожаловать!' : 'Регистрация успешна!');
        loadWishes(data.user.id);
        loadNotifications(data.user.id);
      } else {
        toast.error(data.error || 'Ошибка авторизации');
      }
    } catch (error) {
      toast.error('Ошибка соединения');
    } finally {
      setLoading(false);
    }
  };

  const handleLinkPartner = async () => {
    if (!partnerUsername.trim() || !user) {
      toast.error('Укажите логин партнёра');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(AUTH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'link_partner',
          user_id: user.id,
          partner_username: partnerUsername
        })
      });

      const data = await response.json();
      
      if (data.success) {
        const updatedUser = { ...user, partner_name: data.partner_name };
        setUser(updatedUser);
        localStorage.setItem('wishbook_user', JSON.stringify(updatedUser));
        setShowPartnerDialog(false);
        setPartnerUsername('');
        toast.success(`Партнёр ${data.partner_name} успешно привязан!`);
        loadWishes(user.id);
      } else {
        toast.error(data.error || 'Ошибка привязки партнёра');
      }
    } catch (error) {
      toast.error('Ошибка соединения');
    } finally {
      setLoading(false);
    }
  };

  const handleAddWish = async () => {
    if (!newWish.title.trim() || !user) {
      toast.error('Укажите название желания');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(WISHES_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          ...newWish
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setNewWish({ title: '', description: '', link: '', image: '' });
        setIsWishDialogOpen(false);
        toast.success('Желание добавлено! 💫');
        loadWishes(user.id);
      } else {
        toast.error('Ошибка добавления желания');
      }
    } catch (error) {
      toast.error('Ошибка соединения');
    } finally {
      setLoading(false);
    }
  };

  const toggleWishCompletion = async (wishId: number, currentStatus: boolean) => {
    if (!user) return;

    try {
      const response = await fetch(WISHES_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wish_id: wishId,
          completed: !currentStatus,
          user_id: user.id
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success(!currentStatus ? 'Желание исполнено! ✨' : 'Желание восстановлено');
        loadWishes(user.id);
      }
    } catch (error) {
      toast.error('Ошибка обновления');
    }
  };

  const handleLogout = () => {
    setUser(null);
    setWishes([]);
    setNotifications([]);
    localStorage.removeItem('wishbook_user');
    toast.info('Вы вышли из системы');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-primary/5 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzhCMTUzOCIgc3Ryb2tlLW9wYWNpdHk9IjAuMDUiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-50"></div>
        
        <Card className="relative w-full max-w-md border-2 border-primary/20 shadow-2xl animate-scale-in">
          <CardHeader className="text-center bg-gradient-to-br from-primary/5 to-accent/10">
            <div className="flex justify-center mb-4">
              <Icon name="Heart" size={48} className="text-primary fill-primary animate-pulse" />
            </div>
            <CardTitle className="font-display text-4xl text-primary mb-2">
              Книга Желаний
            </CardTitle>
            <CardDescription className="text-base">
              Личное пространство для двоих
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <Tabs value={isLogin ? 'login' : 'register'} onValueChange={(v) => setIsLogin(v === 'login')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Вход</TabsTrigger>
                <TabsTrigger value="register">Регистрация</TabsTrigger>
              </TabsList>
              
              <div className="space-y-4 mt-4">
                {!isLogin && (
                  <div>
                    <Label htmlFor="display_name">Ваше имя</Label>
                    <Input
                      id="display_name"
                      value={authData.display_name}
                      onChange={(e) => setAuthData({ ...authData, display_name: e.target.value })}
                      placeholder="Как вас зовут?"
                      className="mt-1.5"
                    />
                  </div>
                )}
                <div>
                  <Label htmlFor="username">Логин</Label>
                  <Input
                    id="username"
                    value={authData.username}
                    onChange={(e) => setAuthData({ ...authData, username: e.target.value })}
                    placeholder="Введите логин"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="password">Пароль</Label>
                  <Input
                    id="password"
                    type="password"
                    value={authData.password}
                    onChange={(e) => setAuthData({ ...authData, password: e.target.value })}
                    placeholder="Введите пароль"
                    className="mt-1.5"
                  />
                </div>
                <Button 
                  onClick={handleAuth} 
                  className="w-full font-display text-lg"
                  disabled={loading}
                >
                  {loading ? 'Загрузка...' : (isLogin ? 'Войти' : 'Зарегистрироваться')}
                </Button>
              </div>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeWishes = wishes.filter(w => !w.completed);
  const archivedWishes = wishes.filter(w => w.completed);
  const myWishes = activeWishes.filter(w => w.owner === 'me');
  const partnerWishes = activeWishes.filter(w => w.owner === 'partner');

  const WishCard = ({ wish }: { wish: Wish }) => (
    <Card className="overflow-hidden border-2 border-primary/20 shadow-lg hover:shadow-xl transition-all duration-300 animate-fade-in">
      <CardHeader className="bg-gradient-to-br from-primary/5 to-accent/10 border-b-2 border-primary/10">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="font-display text-2xl text-primary flex items-center gap-2">
              {wish.title}
              {wish.owner === 'partner' && (
                <Icon name="Heart" size={20} className="text-destructive fill-destructive animate-pulse" />
              )}
            </CardTitle>
            <CardDescription className="text-sm mt-1 flex items-center gap-2">
              <span>{new Date(wish.createdAt).toLocaleDateString('ru-RU', { 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric' 
              })}</span>
              <Badge variant="secondary" className="text-xs">
                {wish.owner_name}
              </Badge>
            </CardDescription>
          </div>
          <Checkbox
            checked={wish.completed}
            onCheckedChange={() => toggleWishCompletion(wish.id, wish.completed)}
            className="mt-1"
          />
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {wish.image && (
          <img 
            src={wish.image} 
            alt={wish.title} 
            className="w-full h-48 object-cover rounded-lg mb-4 border-2 border-accent/30"
          />
        )}
        <p className="text-foreground/80 leading-relaxed mb-4">{wish.description}</p>
        {wish.link && (
          <a 
            href={wish.link} 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-secondary hover:text-secondary/80 transition-colors font-semibold"
          >
            <Icon name="ExternalLink" size={16} />
            Посмотреть подробнее
          </a>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-primary/5">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzhCMTUzOCIgc3Ryb2tlLW9wYWNpdHk9IjAuMDUiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-50"></div>
      
      <div className="relative container mx-auto px-4 py-12">
        <header className="text-center mb-8 animate-scale-in">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-3">
              <Icon name="User" size={20} className="text-primary" />
              <span className="font-display text-lg text-primary">{user.display_name}</span>
              {user.partner_name && (
                <>
                  <Icon name="Heart" size={16} className="text-destructive fill-destructive" />
                  <span className="font-display text-lg text-secondary">{user.partner_name}</span>
                </>
              )}
            </div>
            <div className="flex gap-2">
              {notifications.length > 0 && (
                <Badge variant="destructive" className="animate-pulse">
                  {notifications.length} новых
                </Badge>
              )}
              {!user.partner_name && (
                <Button variant="outline" size="sm" onClick={() => setShowPartnerDialog(true)}>
                  <Icon name="UserPlus" size={16} className="mr-2" />
                  Привязать партнёра
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <Icon name="LogOut" size={16} className="mr-2" />
                Выйти
              </Button>
            </div>
          </div>

          <div className="inline-block mb-4">
            <div className="flex items-center justify-center gap-3 text-primary">
              <Icon name="Sparkles" size={32} className="animate-pulse" />
              <Icon name="Heart" size={40} className="fill-primary animate-pulse" />
              <Icon name="Sparkles" size={32} className="animate-pulse" />
            </div>
          </div>
          <h1 className="font-display text-6xl font-bold text-primary mb-4 tracking-wide">
            Книга Желаний
          </h1>
          <p className="text-xl text-muted-foreground font-display italic">
            Место, где мечты обретают крылья
          </p>
          <div className="mt-6 flex items-center justify-center gap-2">
            <div className="h-px w-24 bg-gradient-to-r from-transparent to-primary/30"></div>
            <Icon name="Gem" size={20} className="text-accent" />
            <div className="h-px w-24 bg-gradient-to-l from-transparent to-primary/30"></div>
          </div>
        </header>

        <div className="max-w-4xl mx-auto mb-8 flex justify-center">
          <Dialog open={isWishDialogOpen} onOpenChange={setIsWishDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="shadow-lg hover:shadow-xl transition-all duration-300 font-display text-lg">
                <Icon name="Plus" size={20} className="mr-2" />
                Добавить желание
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px] border-2 border-primary/20">
              <DialogHeader>
                <DialogTitle className="font-display text-3xl text-primary">Новое желание</DialogTitle>
                <DialogDescription>
                  Добавьте своё желание с описанием и ссылками
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="title">Название</Label>
                  <Input
                    id="title"
                    value={newWish.title}
                    onChange={(e) => setNewWish({ ...newWish, title: e.target.value })}
                    placeholder="Например: Путешествие в Венецию"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Описание</Label>
                  <Textarea
                    id="description"
                    value={newWish.description}
                    onChange={(e) => setNewWish({ ...newWish, description: e.target.value })}
                    placeholder="Расскажите подробнее о вашем желании..."
                    className="mt-1.5 min-h-[100px]"
                  />
                </div>
                <div>
                  <Label htmlFor="link">Ссылка (необязательно)</Label>
                  <Input
                    id="link"
                    type="url"
                    value={newWish.link}
                    onChange={(e) => setNewWish({ ...newWish, link: e.target.value })}
                    placeholder="https://..."
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="image">URL изображения (необязательно)</Label>
                  <Input
                    id="image"
                    type="url"
                    value={newWish.image}
                    onChange={(e) => setNewWish({ ...newWish, image: e.target.value })}
                    placeholder="https://..."
                    className="mt-1.5"
                  />
                </div>
                <Button onClick={handleAddWish} className="w-full font-display text-lg" disabled={loading}>
                  <Icon name="Sparkles" size={18} className="mr-2" />
                  {loading ? 'Сохранение...' : 'Сохранить желание'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {notifications.length > 0 && (
          <div className="max-w-4xl mx-auto mb-6">
            <Card className="border-2 border-destructive/30 bg-destructive/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <Icon name="Bell" size={20} />
                  Уведомления
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {notifications.map((notif) => (
                  <div key={notif.id} className="flex items-center gap-2 p-2 rounded bg-background">
                    <Icon name="Info" size={16} className="text-primary" />
                    <p className="text-sm">{notif.message}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="all" className="max-w-6xl mx-auto">
          <TabsList className="grid w-full grid-cols-4 mb-8 h-auto p-1 bg-card/50 backdrop-blur border-2 border-primary/10">
            <TabsTrigger value="all" className="font-display text-base data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-3">
              <Icon name="Home" size={18} className="mr-2" />
              Все желания
            </TabsTrigger>
            <TabsTrigger value="mine" className="font-display text-base data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-3">
              <Icon name="User" size={18} className="mr-2" />
              Мои
            </TabsTrigger>
            <TabsTrigger value="partner" className="font-display text-base data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground py-3">
              <Icon name="Heart" size={18} className="mr-2" />
              Партнёра
            </TabsTrigger>
            <TabsTrigger value="archive" className="font-display text-base data-[state=active]:bg-accent data-[state=active]:text-accent-foreground py-3">
              <Icon name="Archive" size={18} className="mr-2" />
              Архив
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-6">
            {activeWishes.length === 0 ? (
              <Card className="border-2 border-dashed border-primary/20">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Icon name="Sparkles" size={48} className="text-muted-foreground mb-4" />
                  <p className="text-lg text-muted-foreground font-display">
                    Пока нет активных желаний
                  </p>
                </CardContent>
              </Card>
            ) : (
              activeWishes.map((wish) => <WishCard key={wish.id} wish={wish} />)
            )}
          </TabsContent>

          <TabsContent value="mine" className="space-y-6">
            {myWishes.length === 0 ? (
              <Card className="border-2 border-dashed border-primary/20">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Icon name="User" size={48} className="text-muted-foreground mb-4" />
                  <p className="text-lg text-muted-foreground font-display">
                    У вас пока нет желаний
                  </p>
                </CardContent>
              </Card>
            ) : (
              myWishes.map((wish) => <WishCard key={wish.id} wish={wish} />)
            )}
          </TabsContent>

          <TabsContent value="partner" className="space-y-6">
            {partnerWishes.length === 0 ? (
              <Card className="border-2 border-dashed border-secondary/20">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Icon name="Heart" size={48} className="text-muted-foreground mb-4" />
                  <p className="text-lg text-muted-foreground font-display">
                    У партнёра пока нет желаний
                  </p>
                </CardContent>
              </Card>
            ) : (
              partnerWishes.map((wish) => <WishCard key={wish.id} wish={wish} />)
            )}
          </TabsContent>

          <TabsContent value="archive" className="space-y-6">
            {archivedWishes.length === 0 ? (
              <Card className="border-2 border-dashed border-accent/20">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Icon name="Archive" size={48} className="text-muted-foreground mb-4" />
                  <p className="text-lg text-muted-foreground font-display">
                    Архив пуст
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {archivedWishes.map((wish) => (
                  <Card key={wish.id} className="overflow-hidden border-2 border-accent/30 opacity-75 animate-fade-in">
                    <CardHeader className="bg-gradient-to-br from-accent/10 to-accent/5">
                      <CardTitle className="font-display text-xl text-foreground/70 line-through flex items-center gap-2">
                        <Icon name="CheckCircle2" size={20} className="text-accent" />
                        {wish.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <p className="text-foreground/60">{wish.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <Dialog open={showPartnerDialog} onOpenChange={setShowPartnerDialog}>
          <DialogContent className="sm:max-w-[450px] border-2 border-primary/20">
            <DialogHeader>
              <DialogTitle className="font-display text-2xl text-primary">Привязать партнёра</DialogTitle>
              <DialogDescription>
                Укажите логин партнёра для совместного использования
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="partner_username">Логин партнёра</Label>
                <Input
                  id="partner_username"
                  value={partnerUsername}
                  onChange={(e) => setPartnerUsername(e.target.value)}
                  placeholder="Введите логин"
                  className="mt-1.5"
                />
              </div>
              <Button onClick={handleLinkPartner} className="w-full" disabled={loading}>
                <Icon name="UserPlus" size={18} className="mr-2" />
                {loading ? 'Подключение...' : 'Привязать'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Index;
