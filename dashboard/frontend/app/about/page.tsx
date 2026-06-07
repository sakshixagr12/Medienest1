import Link from "next/link";
import PublicNav from "@/components/PublicNav";
import PublicFooter from "@/components/PublicFooter";
import styles from "../privacy/page.module.css";

export default function AboutUs() {
  return (
    <div className={styles.page}>
      <PublicNav />

      <div className={styles.container}>
        <div className={styles.header}>
          <h1>About Us</h1>
          <p>Learn more about the mission, vision, and team behind Jivora Care.</p>
        </div>

        <div className={styles.content}>
          <h2>Our Mission</h2>
          <p>
            Jivora Care exists to empower healthcare professionals by automating administrative documentation, prescription generation, and billing workflows. By removing the daily operational friction from clinic management, we enable doctors to dedicate their full focus and energy to what matters most: patient care.
          </p>

          <h2>Our Vision</h2>
          <p>
            We are building a future where healthcare administrative workflows are completely seamless, secure, and digitally integrated. Through intelligent clinical assistance, Jivora Care aims to be the foundational digital infrastructure for modern outpatient practices and clinics worldwide.
          </p>

          <h2>Company Information</h2>
          <p>
            Jivora Care is designed, developed, and maintained with a commitment to privacy, reliability, and clinical utility.
          </p>
          <ul>
            <li><strong>Company Name:</strong> Jivora Care Technologies</li>
            <li><strong>Country:</strong> India</li>
            <li><strong>Contact Email:</strong> utkarsh.shukla.ind@gmail.com</li>
          </ul>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}
