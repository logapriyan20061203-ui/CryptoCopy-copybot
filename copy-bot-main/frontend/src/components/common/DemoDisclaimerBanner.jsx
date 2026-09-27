import React from 'react';
import { ShieldAlert } from 'lucide-react';
import Badge from './Badge';

const DemoDisclaimerBanner = () => {
  return (
    <div className="demo-disclaimer" role="note">
      <ShieldAlert size={17} aria-hidden="true" />
      <div className="demo-disclaimer-copy">
        <strong>Demonstration data</strong>
        <span>Metrics, trader lists, and portfolio balances are sample data. No live wallets or real-money trading connections are active.</span>
      </div>
      <Badge variant="demo">Sample / Not Real Data</Badge>
    </div>
  );
};

export default DemoDisclaimerBanner;
