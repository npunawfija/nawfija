import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { GraduationCap, Plus, Calendar, User, Video, Image as ImageIcon, Award, BookOpen, Users } from 'lucide-react';

interface Post {
  id: number;
  title: string;
  content: string;
  body_rich?: string;
  image_url?: string;
  video_url?: string;
  tags: string[];
  created_at: string;
  published_at?: string;
  status: string;
  users?: {
    name: string;
  };
}

const Vocational = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [userRole, setUserRole] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showAddPost, setShowAddPost] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [tags, setTags] = useState('');

  useEffect(() => {
    fetchPosts();
    if (user) {
      fetchUserRole();
    }
  }, [user]);

  const fetchUserRole = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('auth_id', user?.id)
        .single();
      
      if (data) {
        setUserRole(data.role);
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
    }
  };

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('content_posts')
        .select(`
          *,
          users (
            name
          )
        `)
        .eq('page', 'vocational')
        .eq('status', 'published')
        .order('published_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setPosts(data);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addPost = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: currentUser } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', user?.id)
        .single();

      const postData = {
        title,
        content,
        image_url: imageUrl || null,
        video_url: videoUrl || null,
        tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        page: 'vocational',
        author_id: currentUser?.id,
        status: 'published',
        published_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('content_posts')
        .insert([postData]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Post added successfully",
      });

      setShowAddPost(false);
      setTitle('');
      setContent('');
      setImageUrl('');
      setVideoUrl('');
      setTags('');
      fetchPosts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const canManageContent = userRole === 'super_user' || userRole === 'admin';

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <GraduationCap className="h-8 w-8 text-blue-600" />
            Vocational & Skills
          </h1>
          <p className="text-muted-foreground">Training programs, workshops, and skill development opportunities</p>
        </div>
        
        {canManageContent && (
          <Dialog open={showAddPost} onOpenChange={setShowAddPost}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Post
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add Vocational Post</DialogTitle>
                <DialogDescription>
                  Share training programs, workshops, and success stories.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={addPost} className="space-y-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter post title..."
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="content">Content</Label>
                  <Textarea
                    id="content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Write your post content..."
                    rows={6}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="imageUrl">Image URL (Optional)</Label>
                  <Input
                    id="imageUrl"
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
                
                <div>
                  <Label htmlFor="videoUrl">Video URL (Optional)</Label>
                  <Input
                    id="videoUrl"
                    type="url"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://youtube.com/watch?v=..."
                  />
                </div>
                
                <div>
                  <Label htmlFor="tags">Tags (Optional)</Label>
                  <Input
                    id="tags"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="skills, training, workshop (comma separated)"
                  />
                </div>
                
                <Button type="submit" className="w-full">Publish Post</Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Featured Programs */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-800">Skill Development Programs</CardTitle>
          <CardDescription className="text-blue-700">
            Empowering our community through education and professional development
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <BookOpen className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-blue-800">Workshops</h3>
            <p className="text-sm text-blue-700">Regular skill workshops</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Award className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-blue-800">Certifications</h3>
            <p className="text-sm text-blue-700">Professional certificates</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-blue-800">Mentorship</h3>
            <p className="text-sm text-blue-700">Guidance programs</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <GraduationCap className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-blue-800">Success Stories</h3>
            <p className="text-sm text-blue-700">Community achievements</p>
          </div>
        </CardContent>
      </Card>

      {/* Posts */}
      <div className="space-y-6">
        {posts.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground mb-2">No posts yet</h3>
              <p className="text-muted-foreground">
                {canManageContent 
                  ? "Start sharing vocational training content with the community."
                  : "Check back later for training programs and skill development opportunities."
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          posts.map((post) => (
            <Card key={post.id} className="overflow-hidden">
              {post.image_url && (
                <div className="aspect-video w-full overflow-hidden">
                  <img 
                    src={post.image_url} 
                    alt={post.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <CardTitle className="text-xl">{post.title}</CardTitle>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {post.users?.name || 'Anonymous'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(post.published_at || post.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    {post.image_url && (
                      <Badge variant="secondary" className="text-xs">
                        <ImageIcon className="h-3 w-3 mr-1" />
                        Image
                      </Badge>
                    )}
                    {post.video_url && (
                      <Badge variant="secondary" className="text-xs">
                        <Video className="h-3 w-3 mr-1" />
                        Video
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <p className="text-muted-foreground mb-4 leading-relaxed">
                  {post.content}
                </p>
                
                {post.video_url && (
                  <div className="mb-4">
                    <div className="aspect-video w-full">
                      <iframe
                        src={post.video_url.replace('watch?v=', 'embed/')}
                        className="w-full h-full rounded-lg"
                        allowFullScreen
                        title={post.title}
                      />
                    </div>
                  </div>
                )}
                
                {post.tags && post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {post.tags.map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default Vocational;