import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, ArrowRight, MapPin, Phone, Mail, Calendar } from 'lucide-react';

interface NPUBranch {
  id: string;
  name: string;
  description?: string;
  contacts: any;
  media: any;
  created_at: string;
}

const NPU = () => {
  const [branches, setBranches] = useState<NPUBranch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBranches();
  }, []);

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
    } finally {
      setLoading(false);
    }
  };

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
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-foreground flex items-center justify-center gap-3">
          <Users className="h-10 w-10 text-purple-600" />
          NPU Programs
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Connecting women, youth, and committee initiatives across our community
        </p>
      </div>

      {/* Main Programs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-none shadow-md bg-gradient-to-br from-pink-50 to-rose-50">
          <CardHeader>
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center mb-4">
              <Users className="h-6 w-6 text-white" />
            </div>
            <CardTitle className="text-xl group-hover:text-primary transition-colors">
              Women Programs
            </CardTitle>
            <CardDescription>
              Empowering women through leadership, education, and economic opportunities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground mb-4">
              <li>• Women leadership development</li>
              <li>• Economic empowerment initiatives</li>
              <li>• Health and wellness programs</li>
              <li>• Skills training workshops</li>
            </ul>
            <Button asChild variant="ghost" className="w-full justify-between group-hover:bg-primary/10">
              <Link to="/npu/women">
                Learn More
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-none shadow-md bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardHeader>
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-4">
              <Users className="h-6 w-6 text-white" />
            </div>
            <CardTitle className="text-xl group-hover:text-primary transition-colors">
              Youth Programs
            </CardTitle>
            <CardDescription>
              Developing young leaders and providing opportunities for growth and engagement
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground mb-4">
              <li>• Youth leadership training</li>
              <li>• Educational scholarships</li>
              <li>• Sports and recreation</li>
              <li>• Mentorship programs</li>
            </ul>
            <Button asChild variant="ghost" className="w-full justify-between group-hover:bg-primary/10">
              <Link to="/npu/youth">
                Learn More
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-none shadow-md bg-gradient-to-br from-emerald-50 to-green-50">
          <CardHeader>
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center mb-4">
              <Users className="h-6 w-6 text-white" />
            </div>
            <CardTitle className="text-xl group-hover:text-primary transition-colors">
              Committee Programs
            </CardTitle>
            <CardDescription>
              Organizational leadership and community governance initiatives
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground mb-4">
              <li>• Leadership committees</li>
              <li>• Community governance</li>
              <li>• Project management</li>
              <li>• Strategic planning</li>
            </ul>
            <Button asChild variant="ghost" className="w-full justify-between group-hover:bg-primary/10">
              <Link to="/npu/committee">
                Learn More
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* NPU Branches */}
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">NPU Branches</h2>
          <p className="text-muted-foreground">
            Connect with NPU branches in different locations
          </p>
        </div>

        {branches.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground mb-2">No branches yet</h3>
              <p className="text-muted-foreground">
                NPU branches will be listed here once they are established.
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
        
        <div className="text-center">
          <Button asChild size="lg" variant="outline">
            <Link to="/npu/branches">
              View All Branches
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Call to Action */}
      <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
        <CardContent className="text-center py-8">
          <h3 className="text-2xl font-bold text-purple-800 mb-4">
            Get Involved with NPU Programs
          </h3>
          <p className="text-purple-700 mb-6 max-w-2xl mx-auto">
            Join our community programs and make a difference. Whether you're interested in women's empowerment, 
            youth development, or community leadership, there's a place for you.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg">
              <Link to="/contact">
                Contact Us
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

export default NPU;