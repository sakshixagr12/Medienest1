export interface DemoPatient {
  id: string;
  name: string;
  age: number;
  gender: string;
  contact: string;
  blood_group: string;
  weight: number;
  allergies: string;
  history: string;
}

export interface DemoQueueEntry {
  id: string;
  patient_id: string;
  patient_name: string;
  token_number: number;
  status: "waiting" | "serving" | "done" | "skipped";
  priority: "normal" | "urgent" | "elderly";
  check_in_time: string;
  notes: string;
}

export const mockPatients: DemoPatient[] = [
  {
    id: "p-rahul",
    name: "RAHUL VERMA",
    age: 34,
    gender: "Male",
    contact: "+91 98765 43210",
    blood_group: "O+",
    weight: 72,
    allergies: "Penicillin",
    history: "Seasonal bronchial asthma. Last visited 3 months ago for mild wheezing and dry cough. No chronic hypertension."
  },
  {
    id: "p-priya",
    name: "PRIYA SHARMA",
    age: 29,
    gender: "Female",
    contact: "+91 91234 56789",
    blood_group: "B+",
    weight: 58,
    allergies: "Sulfonamides",
    history: "Gastroenteritis resolved 6 months ago. Family history of Type 2 Diabetes."
  },
  {
    id: "p-amit",
    name: "AMIT SINGH",
    age: 45,
    gender: "Male",
    contact: "+91 93456 78901",
    blood_group: "A+",
    weight: 80,
    allergies: "None",
    history: "Chronic low back pain. Follows lifestyle adjustments."
  },
  {
    id: "p-neha",
    name: "NEHA JOSHI",
    age: 26,
    gender: "Female",
    contact: "+91 94567 89012",
    blood_group: "AB+",
    weight: 52,
    allergies: "None",
    history: "Routine annual checkup."
  },
  {
    id: "p-rajesh",
    name: "RAJESH PATEL",
    age: 52,
    gender: "Male",
    contact: "+91 95678 90123",
    blood_group: "O-",
    weight: 76,
    allergies: "Aspirin",
    history: "Mild hypertension controlled with Amlodipine 5mg."
  },
  {
    id: "p-sunita",
    name: "SUNITA RAO",
    age: 61,
    gender: "Female",
    contact: "+91 96789 01234",
    blood_group: "B-",
    weight: 64,
    allergies: "None",
    history: "Osteoarthritis of both knees. Undergoing physiotherapy."
  }
];

export const mockQueue: DemoQueueEntry[] = [
  {
    id: "q-rahul",
    patient_id: "p-rahul",
    patient_name: "Rahul Verma",
    token_number: 1,
    status: "waiting",
    priority: "urgent",
    check_in_time: "09:30 AM",
    notes: "Complaining of mild wheezing."
  },
  {
    id: "q-priya",
    patient_id: "p-priya",
    patient_name: "Priya Sharma",
    token_number: 2,
    status: "waiting",
    priority: "elderly",
    check_in_time: "09:45 AM",
    notes: "Routine checkup."
  }
];