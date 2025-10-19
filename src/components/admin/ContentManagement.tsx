import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { 
  FileText, 
  Plus, 
  Edit,
  Eye,
  Calendar,
  Image,
  Video,
  Upload,
  Save,
  Clock
} from 'lucide-react';

interface ContentSection {
  id: string;
  page_name: string;
  section_key: string;
  title?: string;
  content?: string;
  media_urls: string[];
  status: 'draft' | 'published' | 'scheduled';
  scheduled_for?: string;
  created_at: string;
  updated_at: string;
}

const PAGE_OPTIONS = [
  { value: 'home', label: 'Home Page' },
  { value: 'agriculture', label: 'Agriculture Page' },
  { value: 'vocational', label: 'Vocational & Skills Page' },
  { value: 'npu-women', label: 'NPU Women Page' },
  { value: 'npu-youth', label: 'NPU Youth Page' },
  { value: 'npu-committee', label: 'NPU Committee Page' },
  { value: 'npu-branches', label: 'NPU Branches Page' },
  { value: 'information', label: 'Information Page' },
  { value: 'about', label: 'About Section' }
];

const SECTION_KEYS = {
  home: ['hero', 'mission', 'vision', 'motto', 'history', 'news'],
  agriculture: ['overview', 'programs', 'articles', 'gallery'],
  vocational: ['training-programs', 'opportunities', 'success-stories'],
  'npu-women': ['programs', 'leadership', 'activities', 'gallery'],
  'npu-youth': ['programs', 'activities', 'leadership', 'gallery'],
  'npu-committee': ['members', 'responsibilities', 'meetings'],
  'npu-branches': ['locations', 'contacts', 'activities'],
  information: ['council-profiles', 'projects', 'announcements'],
  about: ['history', 'leadership', 'achievements']
};

const ContentManagement = () => {
  const [contentSections, setContentSections] = useState<ContentSection[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Content editor state
  const [showEditor, setShowEditor] = useState(false);
  const [editingContent, setEditingContent] = useState<ContentSection | null>(null);
  const [selectedPage, setSelectedPage] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<'draft' | 'published' | 'scheduled'>('draft');
  const [scheduledFor, setScheduledFor] = useState('');
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [newMediaUrl, setNewMediaUrl] = useState('');

  useEffect(() => {
    fetchContentSections();
  }, []);

  const fetchContentSections = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('content_sections')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      if (data) {
        const sections = data.map(item => ({
          ...item,
          media_urls: Array.isArray(item.media_urls) ? item.media_urls : []
        })) as ContentSection[];
        setContentSections(sections);
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

  const openEditor = (contentSection?: ContentSection) => {
    if (contentSection) {
      setEditingContent(contentSection);
      setSelectedPage(contentSection.page_name);
      setSelectedSection(contentSection.section_key);
      setTitle(contentSection.title || '');
      setContent(contentSection.content || '');
      setStatus(contentSection.status);
      setScheduledFor(contentSection.scheduled_for || '');
      setMediaUrls(contentSection.media_urls || []);
    } else {
      resetForm();
    }
    setShowEditor(true);
  };

  const resetForm = () => {
    setEditingContent(null);
    setSelectedPage('');
    setSelectedSection('');
    setTitle('');
    setContent('');
    setStatus('draft');
    setScheduledFor('');
    setMediaUrls([]);
    setNewMediaUrl('');
  };

  const saveContent = async () => {
    try {
      if (!selectedPage || !selectedSection) {
        toast({
          title: "Error",
          description: "Please select a page and section",
          variant: "destructive",
        });
        return;
      }

      const contentData = {
        page_name: selectedPage,
        section_key: selectedSection,
        title,
        content,
        media_urls: mediaUrls,
        status,
        scheduled_for: scheduledFor || null,
        updated_at: new Date().toISOString()
      };

      let error;
      
      if (editingContent) {
        // Update existing content
        const { error: updateError } = await supabase
          .from('content_sections')
          .update(contentData)
          .eq('id', editingContent.id);
        error = updateError;
      } else {
        // Create new content
        const { data: currentUser } = await supabase
          .from('users')
          .select('id')
          .eq('auth_id', (await supabase.auth.getUser()).data.user?.id)
          .single();

        const { error: insertError } = await supabase
          .from('content_sections')
          .insert({
            ...contentData,
            created_by: currentUser?.id,
            updated_by: currentUser?.id
          });
        error = insertError;
      }

      if (error) throw error;

      // Log the action
      await logSystemAction(
        editingContent ? 'content_updated' : 'content_created',
        'content_section',
        `${selectedPage}-${selectedSection}`,
        { page: selectedPage, section: selectedSection, status }
      );

      toast({
        title: "Success",
        description: `Content ${editingContent ? 'updated' : 'created'} successfully`,
      });

      setShowEditor(false);
      resetForm();
      fetchContentSections();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const publishContent = async (contentId: string) => {
    try {
      const { error } = await supabase
        .from('content_sections')
        .update({ 
          status: 'published',
          updated_at: new Date().toISOString()
        })
        .eq('id', contentId);

      if (error) throw error;

      await logSystemAction('content_published', 'content_section', contentId, {});

      toast({
        title: "Success",
        description: "Content published successfully",
      });

      fetchContentSections();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const addMediaUrl = () => {
    if (newMediaUrl && !mediaUrls.includes(newMediaUrl)) {
      setMediaUrls([...mediaUrls, newMediaUrl]);
      setNewMediaUrl('');
    }
  };

  const removeMediaUrl = (url: string) => {
    setMediaUrls(mediaUrls.filter(mediaUrl => mediaUrl !== url));
  };

  const logSystemAction = async (actionType: string, resourceType: string, resourceId: string, details: any) => {
    try {
      const { data: currentUser } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (currentUser) {
        await supabase.rpc('log_system_action', {
          p_user_id: currentUser.id,
          p_action_type: actionType,
          p_resource_type: resourceType,
          p_resource_id: resourceId,
          p_details: details
        });
      }
    } catch (error) {
      console.error('Failed to log action:', error);
    }
  };

  const getAvailableSections = () => {
    return selectedPage ? SECTION_KEYS[selectedPage as keyof typeof SECTION_KEYS] || [] : [];
  };

  if (loading) {
    return <div className="text-center">Loading content management...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-semibold">Content Management</h3>
          <p className="text-muted-foreground">Manage content across all site pages</p>
        </div>
        
        <Dialog open={showEditor} onOpenChange={setShowEditor}>
          <DialogTrigger asChild>
            <Button onClick={() => openEditor()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Content
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingContent ? 'Edit Content' : 'Add New Content'}
              </DialogTitle>
              <DialogDescription>
                Create or edit content for site pages and sections.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="selectedPage">Page</Label>
                  <Select value={selectedPage} onValueChange={setSelectedPage}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select page" />
                    </SelectTrigger>
                    <SelectContent>
                      {PAGE_OPTIONS.map(page => (
                        <SelectItem key={page.value} value={page.value}>
                          {page.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="selectedSection">Section</Label>
                  <Select 
                    value={selectedSection} 
                    onValueChange={setSelectedSection}
                    disabled={!selectedPage}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select section" />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableSections().map(section => (
                        <SelectItem key={section} value={section}>
                          {section.replace('-', ' ').toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Content title..."
                />
              </div>

              <div>
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write your content here..."
                  rows={8}
                />
              </div>

              <div>
                <Label>Media URLs</Label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={newMediaUrl}
                      onChange={(e) => setNewMediaUrl(e.target.value)}
                      placeholder="Add image or video URL..."
                    />
                    <Button type="button" onClick={addMediaUrl}>
                      <Upload className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {mediaUrls.length > 0 && (
                    <div className="space-y-1">
                      {mediaUrls.map((url, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded">
                          <span className="text-sm flex-1">{url}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeMediaUrl(url)}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={status} onValueChange={(value: any) => setStatus(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {status === 'scheduled' && (
                  <div>
                    <Label htmlFor="scheduledFor">Publish Date</Label>
                    <Input
                      id="scheduledFor"
                      type="datetime-local"
                      value={scheduledFor}
                      onChange={(e) => setScheduledFor(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowEditor(false)}>
                  Cancel
                </Button>
                <Button onClick={saveContent}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Content
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Content List */}
      <div className="space-y-4">
        {contentSections.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                No Content Yet
              </h3>
              <p className="text-muted-foreground">
                Start by adding content sections for your site pages.
              </p>
            </CardContent>
          </Card>
        ) : (
          contentSections.map((contentSection) => (
            <Card key={contentSection.id}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold">
                        {contentSection.title || `${contentSection.page_name} - ${contentSection.section_key}`}
                      </h3>
                      <Badge variant={
                        contentSection.status === 'published' ? 'default' :
                        contentSection.status === 'scheduled' ? 'secondary' :
                        'outline'
                      }>
                        {contentSection.status}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{contentSection.page_name}</span>
                      <span>•</span>
                      <span>{contentSection.section_key}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(contentSection.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                    
                    {contentSection.content && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {contentSection.content.substring(0, 150)}...
                      </p>
                    )}

                    {contentSection.media_urls.length > 0 && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Image className="h-3 w-3" />
                        <span>{contentSection.media_urls.length} media files</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditor(contentSection)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    
                    {contentSection.status === 'draft' && (
                      <Button
                        size="sm"
                        onClick={() => publishContent(contentSection.id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Publish
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default ContentManagement;