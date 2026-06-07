"use client";

import { useEffect, useState } from "react";
import styles from "./GlobalModal.module.css";
import { AlertCircle, HelpCircle } from "lucide-react";

export default function GlobalModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<"alert" | "confirm">("alert");
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState("");
  const [resolvePromise, setResolvePromise] = useState<((value: boolean) => void) | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const originalAlert = window.alert;
      const originalConfirm = window.confirm;

      // Override global window alert
      (window as any).alert = (msg: string) => {
        return new Promise<boolean>((resolve) => {
          setMessage(msg || "");
          setTitle("Alert");
          setType("alert");
          setResolvePromise(() => (val: boolean) => {
            resolve(val);
          });
          setIsOpen(true);
        });
      };

      // Override global window confirm
      (window as any).confirm = (msg: string) => {
        return new Promise<boolean>((resolve) => {
          setMessage(msg || "");
          setTitle("Are you sure?");
          setType("confirm");
          setResolvePromise(() => (val: boolean) => {
            resolve(val);
          });
          setIsOpen(true);
        });
      };

      return () => {
        window.alert = originalAlert;
        window.confirm = originalConfirm;
      };
    }
  }, []);

  const handleClose = (value: boolean) => {
    setIsOpen(false);
    if (resolvePromise) {
      resolvePromise(value);
      setResolvePromise(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.backdrop} onClick={() => type === "alert" && handleClose(true)}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.iconCircle}>
          {type === "alert" ? (
            <AlertCircle className={styles.icon} size={28} />
          ) : (
            <HelpCircle className={styles.icon} size={28} />
          )}
        </div>
        
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.message}>{message}</p>
        
        <div className={styles.actions}>
          {type === "confirm" && (
            <button className={styles.cancelButton} onClick={() => handleClose(false)}>
              Cancel
            </button>
          )}
          <button className={styles.confirmButton} onClick={() => handleClose(true)}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
