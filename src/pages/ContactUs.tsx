const ContactUs = () => {
    return (
      <div className="container mx-auto px-4 py-12 max-w-2xl text-card-foreground">
        <h1 className="text-3xl font-bold mb-6 text-primary">Contact Us</h1>
        
        <div className="bg-card rounded-lg p-6 md:p-8 shadow-sm border border-border/50">
          <p className="text-muted-foreground leading-relaxed mb-6">
            We value your feedback and are always here to help. Whether you have an inquiry, feedback regarding the Daily Tracker, or need assistance, please feel free to reach out to us using the information below.
          </p>
  
          <div className="space-y-4">
            <div className="flex flex-col">
              <strong className="text-foreground text-lg mb-1">Email Support</strong>
              <a href="mailto:support@dailytracker.example.com" className="text-primary hover:underline">
                support@dailytracker.example.com
              </a>
              <span className="text-muted-foreground text-sm mt-1">We aim to respond to all inquiries within 48 hours.</span>
            </div>
            
            <div className="flex flex-col mt-6">
              <strong className="text-foreground text-lg mb-1">Business Inquiries</strong>
              <p className="text-muted-foreground">
                For partnerships, advertising, or business-related questions, please use the subject line "Business Inquiry" when emailing us.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  export default ContactUs;
