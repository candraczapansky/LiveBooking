import React, { useContext } from "react";
import { AuthContext } from "@/contexts/AuthProvider";
import { BusinessBrand } from "@/components/BusinessBrand";

const MobileDashboard = () => {
  const { user } = useContext(AuthContext);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      margin: 0,
      padding: 0,
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Mobile Header */}
      <div style={{
        backgroundColor: '#fb83bd',
        color: 'white',
        padding: '20px 16px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '600' }}>
              <BusinessBrand size="md" showName={true} />
            </h1>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', opacity: 0.9 }}>
              Welcome, {user?.firstName || 'Admin'}!
            </p>
          </div>
          <div style={{ fontSize: '28px', cursor: 'pointer' }}>☰</div>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '20px 16px' }}>
        {/* Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#fb83bd', marginBottom: '4px' }}>
              8
            </div>
            <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>
              Today's Appointments
            </div>
          </div>
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#10b981', marginBottom: '4px' }}>
              $1,850
            </div>
            <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>
              Today's Revenue
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          marginBottom: '24px',
          overflow: 'hidden'
        }}>
          <div style={{ padding: '20px 20px 16px 20px', borderBottom: '1px solid #e2e8f0' }}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#1e293b' }}>
              Quick Actions
            </h2>
          </div>
          <div style={{ padding: '16px 20px 20px 20px' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px'
            }}>
              <button style={{
                backgroundColor: '#fb83bd',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '14px 12px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}>
                New Appointment
              </button>
              <button style={{
                backgroundColor: '#6366f1',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '14px 12px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}>
                Add Client
              </button>
              <button style={{
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '14px 12px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}>
                POS Sale
              </button>
              <button style={{
                backgroundColor: '#f59e0b',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '14px 12px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}>
                Reports
              </button>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          overflow: 'hidden'
        }}>
          <div style={{ padding: '20px 20px 16px 20px', borderBottom: '1px solid #e2e8f0' }}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#1e293b' }}>
              Recent Activity
            </h2>
          </div>
          <div style={{ padding: '16px 20px 20px 20px' }}>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '15px', fontWeight: '600', color: '#1e293b', marginBottom: '2px' }}>
                New appointment scheduled
              </div>
              <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '1px' }}>
                Maria Garcia - Full Color & Cut
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                5 minutes ago
              </div>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '15px', fontWeight: '600', color: '#1e293b', marginBottom: '2px' }}>
                Payment received
              </div>
              <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '1px' }}>
                $125.00 - Credit Card Payment
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                12 minutes ago
              </div>
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: '600', color: '#1e293b', marginBottom: '2px' }}>
                New client registered
              </div>
              <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '1px' }}>
                Jennifer Chen
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                45 minutes ago
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileDashboard;