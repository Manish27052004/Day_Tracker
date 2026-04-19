const TermsOfService = () => {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl text-card-foreground">
      <h1 className="text-3xl font-bold mb-6 text-primary">Terms of Service</h1>
      <div className="space-y-6 text-muted-foreground leading-relaxed">
        <p>Last updated: {new Date().toLocaleDateString()}</p>

        <section>
          <h2 className="text-2xl font-semibold mb-3 text-foreground">1. Acceptance of Terms</h2>
          <p>
            By accessing and using the Daily Tracker website, you accept and agree to be bound by the terms and 
            provision of this agreement. Use of the service indicates full acceptance of these terms.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3 text-foreground">2. Use of Service</h2>
          <p>
            You agree to use this application only for lawful purposes. You are responsible for all data, 
            information, and activities that occur under your session or account. The core tools are provided 
            as-is, primarily utilizing local browser storage to operate.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3 text-foreground">3. User Data and Accounts</h2>
          <p>
            If you choose to create an account to sync your data, you are responsible for maintaining the security 
            of your account and password. We cannot and will not be liable for any loss or damage from your failure 
            to comply with this security obligation.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3 text-foreground">4. Modifications to Service</h2>
          <p>
            We reserve the right to modify or discontinue, temporarily or permanently, the service (or any part thereof) 
            with or without notice at any time. You agree that we shall not be liable to you or to any third party for 
            any modification, suspension, or discontinuance of the service.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3 text-foreground">5. Disclaimer of Warranties</h2>
          <p>
            Your use of the service is at your sole risk. The service is provided on an "as is" and "as available" basis. 
            We make no warranty that the service will meet your specific requirements, will be uninterrupted, timely, 
            secure, or error-free.
          </p>
        </section>
      </div>
    </div>
  );
};

export default TermsOfService;
