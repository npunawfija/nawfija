import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { Users, Search, MapPin, Edit, User, Mail, Phone } from 'lucide-react';

interface UserProfile {
  id: string;
  first_name?: string;
  last_name?: string;
  village_name?: string;
  current_location?: string;
  bio?: string;
  profile_photo_url?: string;
  field_visibility: any;
  user_id: string;
  status: string;
  created_at: string;
}

const Networking = () => {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [villageName, setVillageName] = useState('');
  const [currentLocation, setCurrentLocation] = useState('');
  const [bio, setBio] = useState('');
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');

  useEffect(() => {
    fetchProfiles();
    if (user) {
      fetchCurrentUserProfile();
    }
  }, [user]);

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          id,
          first_name,
          last_name,
          village_name,
          current_location,
          bio,
          profile_photo_url,
          field_visibility,
          user_id,
          created_at,
          status
        `)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setProfiles(data as UserProfile[]);
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

  const fetchCurrentUserProfile = async () => {
    try {
      // First get the current user's ID from the users table
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', user?.id)
        .single();

      if (userData) {
        const { data: profileData, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userData.id)
          .single();

        if (profileData) {
          setCurrentUserProfile(profileData);
          setFirstName(profileData.first_name || '');
          setLastName(profileData.last_name || '');
          setVillageName(profileData.village_name || '');
          setCurrentLocation(profileData.current_location || '');
          setBio(profileData.bio || '');
          setProfilePhotoUrl(profileData.profile_photo_url || '');
        }
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Get current user's ID from the users table
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', user?.id)
        .single();

      if (!userData) throw new Error('User not found');

      const profileData = {
        user_id: userData.id,
        first_name: firstName,
        last_name: lastName,
        village_name: villageName,
        current_location: currentLocation,
        bio,
        profile_photo_url: profilePhotoUrl
      };

      let error;
      
      if (currentUserProfile) {
        // Update existing profile
        const result = await supabase
          .from('user_profiles')
          .update(profileData)
          .eq('id', currentUserProfile.id);
        error = result.error;
      } else {
        // Create new profile
        const result = await supabase
          .from('user_profiles')
          .insert([{ ...profileData, status: 'pending' }]);
        error = result.error;
      }

      if (error) throw error;

      toast({
        title: "Success",
        description: currentUserProfile 
          ? "Profile updated successfully" 
          : "Profile created and submitted for approval",
      });

      setShowEditProfile(false);
      fetchProfiles();
      fetchCurrentUserProfile();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredProfiles = profiles.filter(profile => {
    const searchLower = searchTerm.toLowerCase();
    return (
      profile.first_name?.toLowerCase().includes(searchLower) ||
      profile.last_name?.toLowerCase().includes(searchLower) ||
      profile.village_name?.toLowerCase().includes(searchLower) ||
      profile.current_location?.toLowerCase().includes(searchLower)
    );
  });

  const getVisibleField = (profile: UserProfile, field: string, value: string | undefined) => {
    const visibility = profile.field_visibility || {};
    return visibility[field] !== false ? value : null;
  };

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
            <Users className="h-8 w-8 text-orange-600" />
            Networking
          </h1>
          <p className="text-muted-foreground">Connect with community members and build relationships</p>
        </div>
        
        {user && (
          <Dialog open={showEditProfile} onOpenChange={setShowEditProfile}>
            <DialogTrigger asChild>
              <Button>
                <Edit className="h-4 w-4 mr-2" />
                {currentUserProfile ? 'Edit Profile' : 'Create Profile'}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {currentUserProfile ? 'Edit Your Profile' : 'Create Your Profile'}
                </DialogTitle>
                <DialogDescription>
                  Share information about yourself with the community.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={saveProfile} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Enter first name..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Enter last name..."
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="villageName">Village Name</Label>
                    <Input
                      id="villageName"
                      value={villageName}
                      onChange={(e) => setVillageName(e.target.value)}
                      placeholder="Enter village name..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="currentLocation">Current Location</Label>
                    <Input
                      id="currentLocation"
                      value={currentLocation}
                      onChange={(e) => setCurrentLocation(e.target.value)}
                      placeholder="Enter current location..."
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="profilePhotoUrl">Profile Photo URL (Optional)</Label>
                  <Input
                    id="profilePhotoUrl"
                    type="url"
                    value={profilePhotoUrl}
                    onChange={(e) => setProfilePhotoUrl(e.target.value)}
                    placeholder="https://example.com/photo.jpg"
                  />
                </div>
                
                <div>
                  <Label htmlFor="bio">Bio (Optional)</Label>
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell us about yourself..."
                    rows={4}
                  />
                </div>
                
                <Button type="submit" className="w-full">
                  {currentUserProfile ? 'Update Profile' : 'Create Profile'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {!user && (
        <Card className="bg-gradient-to-r from-orange-50 to-red-50 border-orange-200">
          <CardContent className="text-center py-8">
            <Users className="h-12 w-12 text-orange-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-orange-800 mb-2">Join Our Network</h3>
            <p className="text-orange-700 mb-4">
              Sign up to create your profile and connect with community members.
            </p>
            <Button asChild>
              <a href="/auth?mode=signup">Sign Up Now</a>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search members by name, village, or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Badge variant="secondary">
          {filteredProfiles.length} {filteredProfiles.length === 1 ? 'member' : 'members'}
        </Badge>
      </div>

      {/* Member Directory */}
      <div className="space-y-6">
        {filteredProfiles.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                {searchTerm ? 'No members found' : 'No profiles yet'}
              </h3>
              <p className="text-muted-foreground">
                {searchTerm 
                  ? 'Try adjusting your search terms.'
                  : 'Community members will appear here once they create profiles.'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProfiles.map((profile) => (
              <Card key={profile.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="text-center">
                  <Avatar className="w-20 h-20 mx-auto mb-4">
                    <AvatarImage 
                      src={getVisibleField(profile, 'profilePhoto', profile.profile_photo_url) || undefined} 
                      alt={`${profile.first_name} ${profile.last_name}`} 
                    />
                    <AvatarFallback className="text-lg">
                      {(profile.first_name?.[0] || 'U').toUpperCase()}
                      {(profile.last_name?.[0] || '').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div>
                    <CardTitle className="text-lg">
                      {getVisibleField(profile, 'firstName', profile.first_name) && 
                       getVisibleField(profile, 'lastName', profile.last_name) ? (
                        `${getVisibleField(profile, 'firstName', profile.first_name)} ${getVisibleField(profile, 'lastName', profile.last_name)}`
                      ) : (
                        'Community Member'
                      )}
                    </CardTitle>
                    
                    <div className="space-y-2 mt-4">
                      {getVisibleField(profile, 'villageName', profile.village_name) && (
                        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span>{getVisibleField(profile, 'villageName', profile.village_name)}</span>
                        </div>
                      )}
                      
                      {getVisibleField(profile, 'currentLocation', profile.current_location) && (
                        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                          <User className="h-4 w-4" />
                          <span>{getVisibleField(profile, 'currentLocation', profile.current_location)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  {getVisibleField(profile, 'bio', profile.bio) && (
                    <p className="text-sm text-muted-foreground mb-4 text-center leading-relaxed">
                      {getVisibleField(profile, 'bio', profile.bio)}
                    </p>
                  )}
                  
                  {/* Contact information removed for privacy */}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Networking;