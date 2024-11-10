"use client";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import DesignerLogo from "../public/Designer.jpeg";
import styles from "./styles.module.css"; // Import CSS module

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Toggle mobile menu open/close
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Close the mobile menu when a link is clicked
  const handleLinkClick = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className={styles.nav}>
      <div className={styles.logoContainer}>
        <Link href="/home">
          <Image 
            src={DesignerLogo} 
            alt="Designer Logo" 
            width={120}  
            height={90}  
            className={styles.logo} 
            priority       
          />
        </Link>
      </div>
      
      {/* Hamburger Icon for mobile */}
      <button className={styles.hamburger} onClick={toggleMobileMenu}>
        &#9776; {/* Hamburger icon */}
      </button>

      {/* Navbar Links */}
      <ul className={`${styles.ul} ${isMobileMenuOpen ? styles.open : ''}`}>
        <li className={styles.li}>
          <Link href="/home" onClick={handleLinkClick}>Home</Link>
        </li>
        <li className={styles.li}>
          <Link href="/roster" onClick={handleLinkClick}>Roster</Link>
        </li>
        <li className={styles.li}>
          <Link href="/events" onClick={handleLinkClick}>Events</Link>
        </li>
        <li className={styles.li}>
          <Link href="/athlete" onClick={handleLinkClick}>Athlete</Link>
        </li>
      </ul>
    </nav>
  );
};

export default Navbar;
