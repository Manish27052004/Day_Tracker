const PrivacyPolicy = () => {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl text-card-foreground">
      <h1 className="text-3xl font-bold mb-6 text-primary">Privacy Policy</h1>
      <div className="space-y-6 text-muted-foreground leading-relaxed">
        <p>Last updated: {new Date().toLocaleDateString()}</p>

        <section>
          <h2 className="text-2xl font-semibold mb-3 text-foreground">1. Introduction</h2>
          <p>
            Welcome to the Daily Tracker. We respect your privacy and are committed to protecting your personal data. 
            This privacy policy will inform you as to how we look after your personal data when you visit our website 
            and tell you about your privacy rights.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3 text-foreground">2. Data Collection and Local Storage</h2>
          <p>
            By default, all your tracking data, habits, and tasks are stored locally on your device within your browser. 
            We do not transmit this data to our servers unless you explicitly sign up for a synchronized account. 
            If you create an account, your data is securely stored and encrypted to ensure only you have access to it.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3 text-foreground">3. Third-Party Cookies and Advertising (Google AdSense)</h2>
          <p>
            We use third-party advertising companies, including Google, to serve ads when you visit our website. 
            Google uses cookies to serve ads based on your prior visits to our website or other websites. 
            Google's use of advertising cookies enables it and its partners to serve ads to you based on your visit 
            to our sites and/or other sites on the Internet.
          </p>
          <p className="mt-2">
            You may opt out of personalized advertising by visiting <a href="https://www.google.com/settings/ads" target="_blank" rel="noreferrer" className="text-primary hover:underline">Ads Settings</a>.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3 text-foreground">4. Analytics</h2>
          <p>
            We may use some basic, anonymized analytical tools to understand how our application is being used, 
            which helps us improve the user experience. This data cannot be traced back to any individual user.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3 text-foreground">5. Changes to This Policy</h2>
          <p>
            We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new 
            Privacy Policy on this page. You are advised to review this Privacy Policy periodically for any changes.
          </p>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
