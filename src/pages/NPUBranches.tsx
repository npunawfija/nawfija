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
import { MapPin, Plus, Calendar, User, ArrowLeft, Phone, Mail, Users } from 'lucide-react';

interface NPUBranch {
  id: string;
  name: string;
  description?: string;
  contacts: any;
  media: any;
  created_at: string;
}

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

const NPUBranches = () => {
  const { user } = useAuth();
  const [branches, setBranches] = useState<NPUBranch[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [userRole, setUserRole] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showAddPost, setShowAddPost] = useState(false);
  const [showAddBranch, setShowAddBranch] = useState(false);

  // Post form state
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postImageUrl, setPostImageUrl] = useState('');
  const [postVideoUrl, setPostVideoUrl] = useState('');
  const [postTags, setPostTags] = useState('');

  // Branch form state
  const [branchName, setBranchName] = useState('');
  const [branchDescription, setBranchDescription] = useState('');
  const [branchPhone, setBranchPhone] = useState('');
  const [branchEmail, setBranchEmail] = useState('');

  useEffect(() => {
    fetchBranches();
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

  const fetchBranches = async () => {
    try {
      const { data, error } = await supabase
        .from('npu_branches')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setBranches(data);
      }
    } catch (error) {
      console.error('Error fetching NPU branches:', error);
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
        .eq('page', 'npu-branches')
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
        page: 'npu-branches',
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

  const addBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: currentUser } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', user?.id)
        .maybeSingle();

      const branchData = {
        name: branchName,
        description: branchDescription || null,
        contacts: {
          phone: branchPhone || null,
          email: branchEmail || null
        },
        media: [],
        created_by: currentUser?.id
      };

      const { error } = await supabase
        .from('npu_branches')
        .insert([branchData]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Branch added successfully",
      });

      setShowAddBranch(false);
      resetBranchForm();
      fetchBranches();
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

  const resetBranchForm = () => {
    setBranchName('');
    setBranchDescription('');
    setBranchPhone('');
    setBranchEmail('');
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
              <MapPin className="h-8 w-8 text-purple-600" />
              NPU Branches
            </h1>
            <p className="text-muted-foreground">Connect with NPU branches in different locations</p>
          </div>
        </div>
        
        {canManageContent && (
          <div className="flex gap-2">
            <Dialog open={showAddBranch} onOpenChange={setShowAddBranch}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Branch
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add NPU Branch</DialogTitle>
                  <DialogDescription>
                    Add a new NPU branch location with contact details.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={addBranch} className="space-y-4">
                  <div>
                    <Label htmlFor="branchName">Branch Name</Label>
                    <Input
                      id="branchName"
                      value={branchName}
                      onChange={(e) => setBranchName(e.target.value)}
                      required
                      placeholder="e.g., Lagos Branch, Abuja Branch"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="branchDescription">Description</Label>
                    <Textarea
                      id="branchDescription"
                      value={branchDescription}
                      onChange={(e) => setBranchDescription(e.target.value)}
                      rows={3}
                      placeholder="Brief description of the branch and its activities"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="branchPhone">Phone Number</Label>
                      <Input
                        id="branchPhone"
                        value={branchPhone}
                        onChange={(e) => setBranchPhone(e.target.value)}
                        placeholder="+234 xxx xxx xxxx"
                      />
                    </div>
                    <div>
                      <Label htmlFor="branchEmail">Email Address</Label>
                      <Input
                        id="branchEmail"
                        type="email"
                        value={branchEmail}
                        onChange={(e) => setBranchEmail(e.target.value)}
                        placeholder="branch@nawfija.org"
                      />
                    </div>
                  </div>
                  
                  <Button type="submit" className="w-full">Add Branch</Button>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={showAddPost} onOpenChange={setShowAddPost}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Content
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add Branch Content</DialogTitle>
                  <DialogDescription>
                    Share news, updates, and information about NPU branches.
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
                      placeholder="branch, news, update (comma separated)"
                    />
                  </div>
                  
                  <Button type="submit" className="w-full">Publish Content</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {/* NPU Branches */}
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-4">Branch Locations</h2>
          <p className="text-muted-foreground">
            Find and connect with NPU branches across different locations
          </p>
        </div>

        {branches.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground mb-2">No branches yet</h3>
              <p className="text-muted-foreground">
                {canManageContent 
                  ? "Start by adding NPU branch locations."
                  : "NPU branches will be listed here once they are established."
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {branches.map((branch) => (
              <Card key={branch.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    {branch.name}
                  </CardTitle>
                  <CardDescription>
                    {branch.description || 'NPU Branch'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {branch.contacts && (
                    <div className="space-y-2">
                      {branch.contacts.phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{branch.contacts.phone}</span>
                        </div>
                      )}
                      {branch.contacts.email && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span>{branch.contacts.email}</span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Est. {new Date(branch.created_at).getFullYear()}</span>
                  </div>
                  
                  <Button asChild variant="outline" className="w-full">
                    <Link to="/contact">
                      Contact Branch
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Branch News & Updates */}
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-4">Branch News & Updates</h2>
          <p className="text-muted-foreground">
            Latest news and updates from our NPU branches
          </p>
        </div>

        {posts.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground mb-2">No branch content yet</h3>
              <p className="text-muted-foreground">
                {canManageContent 
                  ? "Start sharing news and updates from branch activities."
                  : "Check back later for news and updates from our branches."
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
      <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
        <CardContent className="text-center py-8">
          <h3 className="text-2xl font-bold text-purple-800 mb-4">
            Connect with NPU Branches
          </h3>
          <p className="text-purple-700 mb-6 max-w-2xl mx-auto">
            Find your local NPU branch and get involved in community activities. 
            Connect with like-minded individuals and make a positive impact in your area.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg">
              <Link to="/contact">
                Find Your Branch
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/networking">
                Join Our Network
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NPUBranches;