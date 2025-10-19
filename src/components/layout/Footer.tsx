import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Facebook, Twitter, Instagram } from 'lucide-react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-muted/50 border-t">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand & Contact */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-glow text-primary-foreground font-bold text-lg">
                N
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Nawfija</h3>
                <p className="text-sm text-muted-foreground">Community Portal</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Connecting our community, preserving our heritage, and building our future together.
            </p>
            <div className="space-y-2">
              <a href="mailto:info@nawfija.com" className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors">
                <Mail className="mr-2 h-4 w-4" />
                info@nawfija.com
              </a>
              <a href="tel:+234" className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors">
                <Phone className="mr-2 h-4 w-4" />
                +234-XXX-XXX-XXXX
              </a>
              <div className="flex items-center text-sm text-muted-foreground">
                <MapPin className="mr-2 h-4 w-4" />
                Nawfija Community, Nigeria
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-foreground">Quick Links</h4>
            <nav className="flex flex-col space-y-2">
              <Link to="/agriculture" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Agriculture
              </Link>
              <Link to="/vocational" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Vocational & Skills
              </Link>
              <Link to="/npu" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                NPU Programs
              </Link>
              <Link to="/networking" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Member Directory
              </Link>
              <Link to="/information" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Community Information
              </Link>
            </nav>
          </div>

          {/* Community */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-foreground">Community</h4>
            <nav className="flex flex-col space-y-2">
              <Link to="/npu/women" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Women's Group
              </Link>
              <Link to="/npu/youth" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Youth Development
              </Link>
              <Link to="/npu/committee" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Committee
              </Link>
              <Link to="/npu/branches" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                NPU Branches
              </Link>
              <Link to="/information/projects" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Community Projects
              </Link>
            </nav>
          </div>

          {/* Legal & Social */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-foreground">Connect</h4>
            <div className="flex space-x-4">
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Instagram className="h-5 w-5" />
              </a>
            </div>
            <nav className="flex flex-col space-y-2">
              <Link to="/privacy" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Privacy Policy
              </Link>
              <Link to="/terms" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Terms of Service
              </Link>
              <Link to="/contact" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Contact Us
              </Link>
              <Link to="/sitemap" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Sitemap
              </Link>
            </nav>
          </div>
        </div>

        <div className="border-t mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-muted-foreground">
              © {currentYear} Nawfija Community. All rights reserved.
            </p>
            <p className="text-sm text-muted-foreground mt-2 md:mt-0">
              Built with ❤️ for our community
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;