import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="w-full border-t border-border/40 bg-background py-6 mt-auto">
      <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-sm text-muted-foreground text-center md:text-left">
          &copy; {new Date().getFullYear()} Daily Tracker. All rights reserved.
        </p>
        <nav className="flex gap-4 sm:gap-6 text-sm font-medium">
          <Link
            to="/about"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            About
          </Link>
          <Link
            to="/privacy"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Privacy Policy
          </Link>
          <Link
            to="/terms"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Terms of Service
          </Link>
        </nav>
      </div>
    </footer>
  );
};

export default Footer;
