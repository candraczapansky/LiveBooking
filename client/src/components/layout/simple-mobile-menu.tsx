import { useState, useContext, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Menu, LayoutDashboard, Calendar, Users, UserCircle, Scissors, Package, DollarSign, MapPin, Monitor, CreditCard, BarChart3, Megaphone, Settings, LogOut } from "lucide-react";
import { Link, useLocation } from "wouter";
import { AuthContext } from "@/App";

const SimpleMobileMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [location] = useLocation();
  const { logout } = useContext(AuthContext);

  const navigationItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
    { icon: Calendar, label: "Appointments", href: "/appointments" },
    { icon: Users, label: "Clients", href: "/clients" },
    { icon: UserCircle, label: "Staff", href: "/staff" },
    { icon: Scissors, label: "Services", href: "/services" },
    { icon: Package, label: "Products", href: "/products" },
    { icon: DollarSign, label: "Point of Sale", href: "/pos" },
    { icon: MapPin, label: "Rooms", href: "/rooms" },
    { icon: Monitor, label: "Devices", href: "/devices" },
    { icon: CreditCard, label: "Memberships", href: "/memberships" },
    { icon: BarChart3, label: "Reports", href: "/reports" },
    { icon: Megaphone, label: "Marketing", href: "/marketing" },
    { icon: Settings, label: "Settings", href: "/settings" },
  ];

  const toggleMenu = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("Simple mobile menu toggle, current state:", isOpen);
    const newState = !isOpen;
    setIsOpen(newState);
    console.log("Menu state changed to:", newState);
  };

  const closeMenu = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIsOpen(false);
  };

  console.log("SimpleMobileMenu render - isOpen:", isOpen);

  return (
    <>
      {/* Menu Button */}
      <button 
        onClick={toggleMenu}
        onTouchStart={(e) => e.preventDefault()}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "44px",
          height: "44px",
          backgroundColor: "transparent",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          padding: "0",
          touchAction: "manipulation",
          WebkitTapHighlightColor: "transparent"
        }}
        aria-label="Toggle mobile menu"
      >
        <Menu style={{ width: "24px", height: "24px", color: "#374151" }} />
      </button>

      {/* Mobile Menu Overlay */}
      {isOpen && createPortal(
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999999,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            width: "100vw",
            height: "100vh",
            display: "block"
          }}
          onClick={closeMenu}
        >
          {/* Menu Panel */}
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "280px",
              height: "100vh",
              backgroundColor: "white",
              boxShadow: "0 10px 25px rgba(0, 0, 0, 0.15)",
              display: "flex",
              flexDirection: "column",
              zIndex: 1000000
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px",
              borderBottom: "1px solid #e5e7eb"
            }}>
              <h2 style={{ fontSize: "18px", fontWeight: "600", margin: "0", color: "#111827" }}>
                BeautyBook
              </h2>
              <button
                onClick={closeMenu}
                onTouchStart={(e) => e.preventDefault()}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "44px",
                  height: "44px",
                  backgroundColor: "transparent",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  padding: "0",
                  touchAction: "manipulation",
                  WebkitTapHighlightColor: "transparent"
                }}
                aria-label="Close mobile menu"
              >
                <X style={{ width: "20px", height: "20px", color: "#6b7280" }} />
              </button>
            </div>

            {/* Navigation */}
            <div style={{ flex: "1", padding: "16px", overflowY: "auto" }}>
              {navigationItems.map((item) => {
                const IconComponent = item.icon;
                const isActive = location === item.href || (item.href === "/dashboard" && location === "/");
                
                return (
                  <Link key={item.href} href={item.href}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        padding: "12px",
                        marginBottom: "4px",
                        borderRadius: "6px",
                        cursor: "pointer",
                        backgroundColor: isActive ? "#3b82f6" : "transparent",
                        color: isActive ? "white" : "#374151",
                        fontSize: "14px",
                        fontWeight: "500",
                        textDecoration: "none"
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        closeMenu(e);
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = "#f3f4f6";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = "transparent";
                        }
                      }}
                    >
                      <IconComponent style={{ width: "18px", height: "18px", marginRight: "12px" }} />
                      {item.label}
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Footer */}
            <div style={{ padding: "16px", borderTop: "1px solid #e5e7eb" }}>
              <button
                onClick={() => {
                  logout();
                  closeMenu();
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  width: "100%",
                  padding: "12px",
                  backgroundColor: "transparent",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  color: "#dc2626",
                  fontSize: "14px",
                  fontWeight: "500"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#fef2f2";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                <LogOut style={{ width: "18px", height: "18px", marginRight: "12px" }} />
                Sign Out
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default SimpleMobileMenu;