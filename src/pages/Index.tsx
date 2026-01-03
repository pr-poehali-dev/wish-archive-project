import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';

interface Wish {
  id: number;
  title: string;
  description: string;
  link?: string;
  image?: string;
  owner: 'me' | 'partner';
  completed: boolean;
  createdAt: Date;
}

const Index = () => {
  const [wishes, setWishes] = useState<Wish[]>([
    {
      id: 1,
      title: 'Поездка в Париж',
      description: 'Хочу посетить Эйфелеву башню и прогуляться по Елисейским полям',
      link: 'https://example.com/paris',
      owner: 'me',
      completed: false,
      createdAt: new Date('2024-01-15')
    },
    {
      id: 2,
      title: 'Винтажные часы',
      description: 'Элегантные карманные часы в викторианском стиле',
      link: 'https://example.com/watch',
      owner: 'partner',
      completed: false,
      createdAt: new Date('2024-01-20')
    },
    {
      id: 3,
      title: 'Романтический ужин',
      description: 'Вечер при свечах с любимым человеком',
      owner: 'me',
      completed: true,
      createdAt: new Date('2024-01-10')
    }
  ]);

  const [newWish, setNewWish] = useState({
    title: '',
    description: '',
    link: '',
    image: ''
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleAddWish = () => {
    if (!newWish.title.trim()) {
      toast.error('Укажите название желания');
      return;
    }

    const wish: Wish = {
      id: Date.now(),
      ...newWish,
      owner: 'me',
      completed: false,
      createdAt: new Date()
    };

    setWishes([wish, ...wishes]);
    setNewWish({ title: '', description: '', link: '', image: '' });
    setIsDialogOpen(false);
    toast.success('Желание добавлено! 💫');
  };

  const toggleWishCompletion = (id: number) => {
    setWishes(wishes.map(wish => 
      wish.id === id ? { ...wish, completed: !wish.completed } : wish
    ));
    const wish = wishes.find(w => w.id === id);
    if (wish && !wish.completed) {
      toast.success('Желание исполнено! ✨');
    }
  };

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
            <CardDescription className="text-sm mt-1">
              {new Date(wish.createdAt).toLocaleDateString('ru-RU', { 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric' 
              })}
            </CardDescription>
          </div>
          <Checkbox
            checked={wish.completed}
            onCheckedChange={() => toggleWishCompletion(wish.id)}
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
        <header className="text-center mb-12 animate-scale-in">
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
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
                  <Label htmlFor="title" className="font-semibold">Название</Label>
                  <Input
                    id="title"
                    value={newWish.title}
                    onChange={(e) => setNewWish({ ...newWish, title: e.target.value })}
                    placeholder="Например: Путешествие в Венецию"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="description" className="font-semibold">Описание</Label>
                  <Textarea
                    id="description"
                    value={newWish.description}
                    onChange={(e) => setNewWish({ ...newWish, description: e.target.value })}
                    placeholder="Расскажите подробнее о вашем желании..."
                    className="mt-1.5 min-h-[100px]"
                  />
                </div>
                <div>
                  <Label htmlFor="link" className="font-semibold">Ссылка (необязательно)</Label>
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
                  <Label htmlFor="image" className="font-semibold">URL изображения (необязательно)</Label>
                  <Input
                    id="image"
                    type="url"
                    value={newWish.image}
                    onChange={(e) => setNewWish({ ...newWish, image: e.target.value })}
                    placeholder="https://..."
                    className="mt-1.5"
                  />
                </div>
                <Button onClick={handleAddWish} className="w-full font-display text-lg">
                  <Icon name="Sparkles" size={18} className="mr-2" />
                  Сохранить желание
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

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
      </div>
    </div>
  );
};

export default Index;
