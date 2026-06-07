import Link from "next/link";
import Image from "next/image";
import styles from "@/app/privacy/page.module.css";

export default function PublicNav() {
  return (
    <nav className={styles.nav}>
      <Link href="/" className={styles.navLogo}>
        <Image
          src="/assets/jivora_care_logo.png"
          alt="Jivora Care"
          width={32}
          height={32}
        />
        <span>Jivora Care</span>
      </Link>
      <Link href="/" className={styles.btnSolidNav}>
        Back to Home
      </Link>
    </nav>
  );
}
