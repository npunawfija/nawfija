import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
import { Users, Plus, Calendar, User, ArrowLeft, PlayCircle } from 'lucide-react';

interface Post {
  id: number;
  title: string;
  content: string;
  body_rich?: string;
  image_url?: string;
  video_url?: string;
  tags: string[];
  page: string;
  created_at: string;
  published_at?: string;
  status: string;
  users?: {
    name: string;
  };
}

const NPUWomen = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [userRole, setUserRole] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showAddPost, setShowAddPost] = useState(false);

  // Post form state
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postImageUrl, setPostImageUrl] = useState('');
  const [postVideoUrl, setPostVideoUrl] = useState('');
  const [postTags, setPostTags] = useState('');

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
        .maybeSingle();
      
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
        .eq('page', 'npu-women')
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
        .maybeSingle();

      const postData = {
        title: postTitle,
        content: postContent,
        image_url: postImageUrl || null,
        video_url: postVideoUrl || null,
        tags: postTags.split(',').map(tag => tag.trim()).filter(tag => tag),
        page: 'npu-women',
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
        description: "Content added successfully",
      });

      setShowAddPost(false);
      resetPostForm();
      fetchPosts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetPostForm = () => {
    setPostTitle('');
    setPostContent('');
    setPostImageUrl('');
    setPostVideoUrl('');
    setPostTags('');
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
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="sm">
            <Link to="/npu">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to NPU
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Users className="h-8 w-8 text-pink-600" />
              Women Programs
            </h1>
            <p className="text-muted-foreground">Empowering women through leadership, education, and economic opportunities</p>
          </div>
        </div>
        
        {canManageContent && (
          <Dialog open={showAddPost} onOpenChange={setShowAddPost}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Content
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add Women's Program Content</DialogTitle>
                <DialogDescription>
                  Share articles, videos, and updates about women's programs.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={addPost} className="space-y-4">
                <div>
                  <Label htmlFor="postTitle">Title</Label>
                  <Input
                    id="postTitle"
                    value={postTitle}
                    onChange={(e) => setPostTitle(e.target.value)}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="postContent">Content</Label>
                  <Textarea
                    id="postContent"
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    rows={6}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="postImageUrl">Image URL (Optional)</Label>
                  <Input
                    id="postImageUrl"
                    type="url"
                    value={postImageUrl}
                    onChange={(e) => setPostImageUrl(e.target.value)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="postVideoUrl">Video URL (Optional)</Label>
                  <Input
                    id="postVideoUrl"
                    type="url"
                    value={postVideoUrl}
                    onChange={(e) => setPostVideoUrl(e.target.value)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="postTags">Tags (Optional)</Label>
                  <Input
                    id="postTags"
                    value={postTags}
                    onChange={(e) => setPostTags(e.target.value)}
                    placeholder="women, leadership, empowerment (comma separated)"
                  />
                </div>
                
                <Button type="submit" className="w-full">Publish Content</Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Program Overview */}
      <Card className="bg-gradient-to-br from-pink-50 to-rose-50 border-pink-200">
        <CardContent className="py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-2xl font-bold text-pink-800 mb-4">Our Mission</h2>
              <p className="text-pink-700 leading-relaxed mb-4">
                To empower women in our community through leadership development, economic opportunities, 
                and educational programs that foster growth and self-sufficiency.
              </p>
              <h3 className="text-lg font-semibold text-pink-800 mb-2">Key Focus Areas:</h3>
              <ul className="space-y-2 text-pink-700">
                <li>• Leadership development and capacity building</li>
                <li>• Economic empowerment and entrepreneurship</li>
                <li>• Health and wellness programs</li>
                <li>• Skills training and vocational development</li>
              </ul>
            </div>
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <h4 className="font-semibold text-pink-800 mb-2">Active Programs</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-2xl font-bold text-pink-600">12+</span>
                    <p className="text-pink-700">Training Sessions</p>
                  </div>
                  <div>
                    <span className="text-2xl font-bold text-pink-600">150+</span>
                    <p className="text-pink-700">Women Empowered</p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <h4 className="font-semibold text-pink-800 mb-2">Next Event</h4>
                <p className="text-sm text-pink-700">Women's Leadership Workshop</p>
                <p className="text-xs text-pink-600">Every first Saturday of the month</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content Section */}
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-4">Articles & Updates</h2>
          <p className="text-muted-foreground">
            Latest news, articles, and updates about our women's programs
          </p>
        </div>

        {posts.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground mb-2">No content yet</h3>
              <p className="text-muted-foreground">
                {canManageContent 
                  ? "Start sharing content about women's programs."
                  : "Check back later for updates about women's programs."
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {posts.map((post) => (
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
            ))}
          </div>
        )}
      </div>

      {/* Call to Action */}
      <Card className="bg-gradient-to-r from-pink-50 to-rose-50 border-pink-200">
        <CardContent className="text-center py-8">
          <h3 className="text-2xl font-bold text-pink-800 mb-4">
            Join Our Women's Programs
          </h3>
          <p className="text-pink-700 mb-6 max-w-2xl mx-auto">
            Be part of our empowering community of women leaders. Join our programs and 
            develop the skills and confidence needed to make a positive impact.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg">
              <Link to="/contact">
                Get Involved
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/networking">
                Connect with Members
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NPUWomen;