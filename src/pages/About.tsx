const About = () => {
    return (
      <div className="container mx-auto px-4 py-12 max-w-4xl text-card-foreground">
        <h1 className="text-3xl font-bold mb-6 text-primary">About Us</h1>
        
        <div className="bg-card rounded-lg p-6 md:p-8 shadow-sm border border-border/50">
          <section className="mb-6">
            <h2 className="text-2xl font-semibold mb-3 text-foreground">Our Mission</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our mission is to help individuals take control of their time and build lasting, positive habits. 
              We believe that consistent daily tracking is the cornerstone of personal transformation and productivity. 
              The Daily Tracker was built with simplicity, speed, and privacy in mind, empowering users to focus on 
              execution rather than getting bogged down by complex software.
            </p>
          </section>
  
          <section className="mb-6">
            <h2 className="text-2xl font-semibold mb-3 text-foreground">What Makes Us Different?</h2>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-2">
              <li><strong className="text-foreground">Privacy-First Architecture:</strong> By defaulting to local browser storage, you own your data.</li>
              <li><strong className="text-foreground">Speed and Efficiency:</strong> A lightweight client-side application that responds instantly.</li>
              <li><strong className="text-foreground">Minimalist Interface:</strong> A clean aesthetic designed to minimize distractions and maximize focus.</li>
            </ul>
          </section>
  
          <section>
            <h2 className="text-2xl font-semibold mb-3 text-foreground">Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              We are constantly working to improve this tool based on user feedback. If you have any suggestions, 
              questions, or run into technical issues, please feel free to reach out. Although this tool is 
              currently provided as a free utility, we are dedicated to maintaining its quality and reliability.
            </p>
          </section>
        </div>
      </div>
    );
  };
  
  export default About;
