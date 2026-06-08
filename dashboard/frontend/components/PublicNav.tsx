import Link from "next/link";
import Image from "next/image";
import styles from "@/app/privacy/page.module.css";

export default function PublicNav() {
  return (
    <nav className={styles.nav}>
      <Link href="/" className={styles.navLogo}>
        <Image
          src="/assets/medienest_logo.png"
          alt="MedieNest"
          width={32}
          height={32}
        />
        <span>MedieNest</span>
      </Link>
      <Link href="/" className={styles.btnSolidNav}>
        Back to Home
      </Link>
    </nav>
  );
}
