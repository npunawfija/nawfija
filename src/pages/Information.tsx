import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Info, Plus, Calendar, User, MapPin, Clock, CheckCircle, AlertCircle, PlayCircle } from 'lucide-react';

interface Project {
  id: string;
  title: string;
  description?: string;
  status: string;
  location?: string;
  start_date?: string;
  end_date?: string;
  cover_image_url?: string;
  funding_summary?: string;
  gallery: any;
  updates: any;
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

const Information = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [userRole, setUserRole] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showAddProject, setShowAddProject] = useState(false);
  const [showAddPost, setShowAddPost] = useState(false);

  // Project form state
  const [projectTitle, setProjectTitle] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [projectStatus, setProjectStatus] = useState('');
  const [projectLocation, setProjectLocation] = useState('');
  const [projectStartDate, setProjectStartDate] = useState('');
  const [projectEndDate, setProjectEndDate] = useState('');
  const [projectImageUrl, setProjectImageUrl] = useState('');
  const [projectFunding, setProjectFunding] = useState('');

  // Post form state
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postImageUrl, setPostImageUrl] = useState('');
  const [postVideoUrl, setPostVideoUrl] = useState('');
  const [postTags, setPostTags] = useState('');
  const [postSection, setPostSection] = useState('information');

  useEffect(() => {
    fetchProjects();
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

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setProjects(data);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
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
        .in('page', ['information', 'traditional-council', 'history', 'gallery'])
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

  const addProject = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: currentUser } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', user?.id)
        .single();

      const projectData = {
        title: projectTitle,
        description: projectDescription,
        status: projectStatus,
        location: projectLocation || null,
        start_date: projectStartDate || null,
        end_date: projectEndDate || null,
        cover_image_url: projectImageUrl || null,
        funding_summary: projectFunding || null,
        created_by: currentUser?.id,
        gallery: [],
        updates: []
      };

      const { error } = await supabase
        .from('projects')
        .insert([projectData]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Project added successfully",
      });

      setShowAddProject(false);
      resetProjectForm();
      fetchProjects();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
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
        title: postTitle,
        content: postContent,
        image_url: postImageUrl || null,
        video_url: postVideoUrl || null,
        tags: postTags.split(',').map(tag => tag.trim()).filter(tag => tag),
        page: postSection,
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
        description: "News post added successfully",
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

  const resetProjectForm = () => {
    setProjectTitle('');
    setProjectDescription('');
    setProjectStatus('');
    setProjectLocation('');
    setProjectStartDate('');
    setProjectEndDate('');
    setProjectImageUrl('');
    setProjectFunding('');
  };

  const resetPostForm = () => {
    setPostTitle('');
    setPostContent('');
    setPostImageUrl('');
    setPostVideoUrl('');
    setPostTags('');
    setPostSection('information');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'in-progress':
        return <PlayCircle className="h-4 w-4 text-blue-600" />;
      case 'upcoming':
        return <Clock className="h-4 w-4 text-orange-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'upcoming':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Info className="h-8 w-8 text-teal-600" />
            Information
          </h1>
          <p className="text-muted-foreground">Community projects, news, and updates</p>
        </div>
        
        {canManageContent && (
          <div className="flex gap-2">
            <Dialog open={showAddProject} onOpenChange={setShowAddProject}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Project
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add New Project</DialogTitle>
                  <DialogDescription>
                    Create a new community project entry.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={addProject} className="space-y-4">
                  <div>
                    <Label htmlFor="projectTitle">Project Title</Label>
                    <Input
                      id="projectTitle"
                      value={projectTitle}
                      onChange={(e) => setProjectTitle(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="projectDescription">Description</Label>
                    <Textarea
                      id="projectDescription"
                      value={projectDescription}
                      onChange={(e) => setProjectDescription(e.target.value)}
                      rows={4}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="projectStatus">Status</Label>
                      <Select value={projectStatus} onValueChange={setProjectStatus} required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="upcoming">Upcoming</SelectItem>
                          <SelectItem value="in-progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="projectLocation">Location</Label>
                      <Input
                        id="projectLocation"
                        value={projectLocation}
                        onChange={(e) => setProjectLocation(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="projectStartDate">Start Date</Label>
                      <Input
                        id="projectStartDate"
                        type="date"
                        value={projectStartDate}
                        onChange={(e) => setProjectStartDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="projectEndDate">End Date</Label>
                      <Input
                        id="projectEndDate"
                        type="date"
                        value={projectEndDate}
                        onChange={(e) => setProjectEndDate(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="projectImageUrl">Cover Image URL</Label>
                    <Input
                      id="projectImageUrl"
                      type="url"
                      value={projectImageUrl}
                      onChange={(e) => setProjectImageUrl(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="projectFunding">Funding Summary</Label>
                    <Textarea
                      id="projectFunding"
                      value={projectFunding}
                      onChange={(e) => setProjectFunding(e.target.value)}
                      rows={3}
                    />
                  </div>
                  
                  <Button type="submit" className="w-full">Add Project</Button>
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
                  <DialogTitle>Add Content</DialogTitle>
                  <DialogDescription>
                    Add content to Traditional Council, History, Gallery, or News sections.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={addPost} className="space-y-4">
                  <div>
                    <Label htmlFor="postSection">Section</Label>
                    <Select value={postSection} onValueChange={setPostSection} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select section" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="information">News & Updates</SelectItem>
                        <SelectItem value="traditional-council">Traditional Council</SelectItem>
                        <SelectItem value="history">History</SelectItem>
                        <SelectItem value="gallery">Gallery</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

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
                      placeholder="news, community, update (comma separated)"
                    />
                  </div>
                  
                  <Button type="submit" className="w-full">Publish Content</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {/* Projects Section */}
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-4">Community Projects</h2>
          <p className="text-muted-foreground">
            Upcoming, in-progress, and completed community initiatives
          </p>
        </div>

        {projects.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground mb-2">No projects yet</h3>
              <p className="text-muted-foreground">
                {canManageContent 
                  ? "Start by adding community projects."
                  : "Community projects will be listed here."
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Card key={project.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                {project.cover_image_url && (
                  <div className="aspect-video w-full overflow-hidden">
                    <img 
                      src={project.cover_image_url} 
                      alt={project.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{project.title}</CardTitle>
                    <Badge className={getStatusColor(project.status)}>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(project.status)}
                        {project.status.replace('-', ' ')}
                      </div>
                    </Badge>
                  </div>
                  
                  <div className="space-y-2 text-sm text-muted-foreground">
                    {project.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span>{project.location}</span>
                      </div>
                    )}
                    {project.start_date && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {new Date(project.start_date).toLocaleDateString()}
                          {project.end_date && ` - ${new Date(project.end_date).toLocaleDateString()}`}
                        </span>
                      </div>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent>
                  {project.description && (
                    <p className="text-muted-foreground mb-4 leading-relaxed">
                      {project.description}
                    </p>
                  )}
                  
                  {project.funding_summary && (
                    <div className="p-3 bg-muted rounded-lg">
                      <h4 className="text-sm font-semibold mb-1">Funding</h4>
                      <p className="text-sm text-muted-foreground">
                        {project.funding_summary}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* News & Updates Section */}
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-4">News & Updates</h2>
          <p className="text-muted-foreground">
            Latest community news and announcements
          </p>
        </div>

        {posts.filter(post => post.page === 'information').length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Info className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground mb-2">No news yet</h3>
              <p className="text-muted-foreground">
                {canManageContent 
                  ? "Start sharing community news and updates."
                  : "Check back later for community news and updates."
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {posts.filter(post => post.page === 'information').map((post) => (
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

      {/* Traditional Council Section */}
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-4">Traditional Council</h2>
          <p className="text-muted-foreground">
            Meet the traditional leaders and council members
          </p>
        </div>

        {posts.filter(post => post.page === 'traditional-council').length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground mb-2">No council profiles yet</h3>
              <p className="text-muted-foreground">
                {canManageContent 
                  ? "Add traditional council member profiles and information."
                  : "Traditional council member profiles will be listed here."
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.filter(post => post.page === 'traditional-council').map((post) => (
              <Card key={post.id} className="overflow-hidden">
                {post.image_url && (
                  <div className="aspect-square w-full overflow-hidden">
                    <img 
                      src={post.image_url} 
                      alt={post.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                
                <CardHeader>
                  <CardTitle className="text-lg">{post.title}</CardTitle>
                  <div className="text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(post.published_at || post.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    {post.content}
                  </p>
                  
                  {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4">
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

      {/* History Section */}
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-4">Community History</h2>
          <p className="text-muted-foreground">
            Stories and heritage of our community
          </p>
        </div>

        {posts.filter(post => post.page === 'history').length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground mb-2">No history content yet</h3>
              <p className="text-muted-foreground">
                {canManageContent 
                  ? "Share the rich history and heritage of our community."
                  : "Community history and heritage stories will be shared here."
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {posts.filter(post => post.page === 'history').map((post) => (
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

      {/* Gallery Section */}
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-4">Community Gallery</h2>
          <p className="text-muted-foreground">
            Photos and videos from community events and activities
          </p>
        </div>

        {posts.filter(post => post.page === 'gallery').length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <PlayCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground mb-2">No gallery content yet</h3>
              <p className="text-muted-foreground">
                {canManageContent 
                  ? "Upload photos and videos from community events."
                  : "Community photos and videos will be displayed here."
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.filter(post => post.page === 'gallery').map((post) => (
              <Card key={post.id} className="overflow-hidden">
                {post.image_url && (
                  <div className="aspect-square w-full overflow-hidden">
                    <img 
                      src={post.image_url} 
                      alt={post.title}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}
                
                {post.video_url && !post.image_url && (
                  <div className="aspect-square w-full overflow-hidden">
                    <iframe
                      src={post.video_url.replace('watch?v=', 'embed/')}
                      className="w-full h-full"
                      allowFullScreen
                      title={post.title}
                    />
                  </div>
                )}
                
                <CardHeader>
                  <CardTitle className="text-lg">{post.title}</CardTitle>
                  <div className="text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(post.published_at || post.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {post.content}
                  </p>
                  
                  {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
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
    </div>
  );
};

export default Information;