import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  DollarSign, 
  Sprout, 
  GraduationCap, 
  Users, 
  Info, 
  ArrowRight,
  Target,
  Eye,
  Heart
} from 'lucide-react';

const Index = () => {
  const quickLinks = [
    {
      title: 'Finance',
      description: 'Track contributions, view financial statements, and manage community funds.',
      icon: DollarSign,
      href: '/finance',
      color: 'from-green-500 to-emerald-600'
    },
    {
      title: 'Agriculture',
      description: 'Discover farming techniques, crop programs, and agricultural initiatives.',
      icon: Sprout,
      href: '/agriculture',
      color: 'from-green-600 to-lime-600'
    },
    {
      title: 'Vocational & Skills',
      description: 'Access training programs and skill development opportunities.',
      icon: GraduationCap,
      href: '/vocational',
      color: 'from-blue-500 to-indigo-600'
    },
    {
      title: 'NPU Programs',
      description: 'Connect with women, youth, and committee initiatives.',
      icon: Users,
      href: '/npu',
      color: 'from-purple-500 to-pink-600'
    },
    {
      title: 'Networking',
      description: 'Connect with community members and build relationships.',
      icon: Users,
      href: '/networking',
      color: 'from-orange-500 to-red-600'
    },
    {
      title: 'Information',
      description: 'Stay updated with news, projects, and community information.',
      icon: Info,
      href: '/information',
      color: 'from-teal-500 to-cyan-600'
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 px-4 bg-gradient-to-br from-primary/10 via-background to-accent/10">
        <div className="container mx-auto text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
              Welcome to <span className="text-primary">Nawfija</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 leading-relaxed">
              Connecting our community, preserving our heritage, and building our future together
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild className="text-lg px-8">
                <Link to="/auth?mode=signup">
                  Join Our Community
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="text-lg px-8">
                <Link to="/information">Learn More</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Mission, Vision, Motto */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="text-center border-none shadow-lg">
              <CardHeader>
                <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-primary-glow rounded-full flex items-center justify-center mb-4">
                  <Target className="h-8 w-8 text-primary-foreground" />
                </div>
                <CardTitle className="text-2xl">Our Mission</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  To foster unity, development, and prosperity within our community through collaboration, education, and sustainable initiatives that benefit all members.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center border-none shadow-lg">
              <CardHeader>
                <div className="mx-auto w-16 h-16 bg-gradient-to-br from-accent to-orange-500 rounded-full flex items-center justify-center mb-4">
                  <Eye className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-2xl">Our Vision</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  To be a model community that thrives through innovation, education, and strong social bonds while preserving our cultural heritage for future generations.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center border-none shadow-lg">
              <CardHeader>
                <div className="mx-auto w-16 h-16 bg-gradient-to-br from-red-500 to-pink-600 rounded-full flex items-center justify-center mb-4">
                  <Heart className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-2xl">Our Motto</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground font-semibold text-lg">
                  "Unity, Progress, Excellence"
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Together we achieve more than we ever could alone.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Explore Our Community
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Discover the various programs, services, and opportunities available to our community members.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quickLinks.map((link) => (
              <Card key={link.title} className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-none shadow-md">
                <CardHeader>
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${link.color} flex items-center justify-center mb-4`}>
                    <link.icon className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-xl group-hover:text-primary transition-colors">
                    {link.title}
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    {link.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild variant="ghost" className="w-full justify-between group-hover:bg-primary/10">
                    <Link to={link.href}>
                      Explore
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-16 px-4 bg-gradient-to-r from-primary/10 to-accent/10">
        <div className="container mx-auto text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
              Ready to Join Our Community?
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Become part of something bigger. Connect with your neighbors, contribute to community projects, and help shape our collective future.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild className="text-lg px-8">
                <Link to="/auth?mode=signup">
                  Get Started Today
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="text-lg px-8">
                <Link to="/contact">
                  Contact Us
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
