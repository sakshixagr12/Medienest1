// Define mock data
const mockClinic = { 
  id: "demo-clinic-id", 
  name: "Shukla Care Clinic", 
  name_hindi: "शुक्ला केयर क्लीनिक",
  phone: "+91 73805 20394", 
  address: "G-15, Sector 62, Noida", 
  tagline: "Intelligent Clinical OS", 
  email: "shuklagopal1244@gmail.com", 
  status: "active", 
  owner_user_id: "demo-user-gopal", 
  created_at: new Date().toISOString(), 
  clinic_type: "clinic" 
};

const mockDoctors = [
  { 
    id: "demo-doc-gopal", 
    doctor_id: "demo-doc-gopal", 
    user_id: "demo-user-gopal",
    name: "Gopal Shukla", 
    qualification: "MBBS, MD (General Medicine)", 
    specialty: "General Medicine", 
    contact: "+91 73805 20394", 
    email: "shuklagopal1244@gmail.com", 
    is_active: true, 
    display_order: 1 
  }
];

const mockClinicDoctors = [
  { 
    id: "demo-clinic-doc-id", 
    clinic_id: "demo-clinic-id", 
    doctor_id: "demo-doc-gopal", 
    is_active: true, 
    display_order: 1, 
    doctors: mockDoctors[0]
  }
];

const mockSubscription = { 
  id: "demo-sub-id", 
  plan_name: "Professional", 
  status: "active", 
  clinic_id: "demo-clinic-id" 
};

const mockReceipts = [
  { total_amount: 500, printed_at: new Date().toISOString(), clinic_id: "demo-clinic-id" },
  { total_amount: 700, printed_at: new Date().toISOString(), clinic_id: "demo-clinic-id" },
  { total_amount: 1200, printed_at: new Date().toISOString(), clinic_id: "demo-clinic-id" },
];

const mockPrescriptions = [
  { id: "rx-1", created_at: new Date().toISOString(), clinic_id: "demo-clinic-id", valid_till: new Date(Date.now() + 86400000 * 5).toISOString(), patients: { name: "Amit Singh" } },
  { id: "rx-2", created_at: new Date().toISOString(), clinic_id: "demo-clinic-id", valid_till: new Date(Date.now() + 86400000 * 5).toISOString(), patients: { name: "Priya Sharma" } },
  { id: "rx-3", created_at: new Date().toISOString(), clinic_id: "demo-clinic-id", valid_till: new Date(Date.now() + 86400000 * 5).toISOString(), patients: { name: "Rahul Verma" } },
  { id: "rx-4", created_at: new Date().toISOString(), clinic_id: "demo-clinic-id", valid_till: new Date(Date.now() + 86400000 * 5).toISOString(), patients: { name: "Suresh Kumar" } },
];

// Helper to keep track of dynamic states during the recruiter walkthrough
let activeQueue = [
  { 
    id: "q-rahul", 
    patient_id: "p-rahul", 
    patient_name: "Rahul Verma", 
    token_number: 1, 
    priority: "urgent", 
    check_in_time: "09:30 AM", 
    status: "waiting", 
    doctor_id: "demo-doc-gopal",
    clinic_id: "demo-clinic-id",
    queue_date: new Date().toISOString().split("T")[0]
  },
  { 
    id: "q-priya", 
    patient_id: "p-priya", 
    patient_name: "Priya Sharma", 
    token_number: 2, 
    priority: "elderly", 
    check_in_time: "09:45 AM", 
    status: "waiting", 
    doctor_id: "demo-doc-gopal",
    clinic_id: "demo-clinic-id",
    queue_date: new Date().toISOString().split("T")[0]
  },
  { 
    id: "q-amit", 
    patient_id: "p-amit", 
    patient_name: "Amit Singh", 
    token_number: 3, 
    priority: "general", 
    check_in_time: "10:00 AM", 
    status: "waiting", 
    doctor_id: "demo-doc-gopal",
    clinic_id: "demo-clinic-id",
    queue_date: new Date().toISOString().split("T")[0]
  },
  { 
    id: "q-suresh", 
    patient_id: "p-suresh", 
    patient_name: "Suresh Kumar", 
    token_number: 4, 
    priority: "general", 
    check_in_time: "10:15 AM", 
    status: "waiting", 
    doctor_id: "demo-doc-gopal",
    clinic_id: "demo-clinic-id",
    queue_date: new Date().toISOString().split("T")[0]
  },
  { 
    id: "q-meena", 
    patient_id: "p-meena", 
    patient_name: "Meena Devi", 
    token_number: 5, 
    priority: "general", 
    check_in_time: "10:30 AM", 
    status: "waiting", 
    doctor_id: "demo-doc-gopal",
    clinic_id: "demo-clinic-id",
    queue_date: new Date().toISOString().split("T")[0]
  }
];

class MockQueryBuilder {
  private table: string;
  private filters: any = {};
  private updateValues: any = null;
  private insertValues: any = null;

  constructor(table: string) {
    this.table = table;
  }

  select(columns?: string, options?: any) { return this; }
  insert(values: any) { 
    this.insertValues = values;
    return this; 
  }
  update(values: any) { 
    this.updateValues = values;
    return this; 
  }
  eq(column: string, value: any) { 
    this.filters[column] = value;
    return this; 
  }
  neq(column: string, value: any) { return this; }
  in(column: string, values: any[]) { 
    this.filters[column] = values;
    return this; 
  }
  ilike(column: string, value: string) {
    this.filters[column] = value;
    return this;
  }
  or(filters: string, options?: any) {
    return this;
  }
  gte(column: string, value: any) { return this; }
  lte(column: string, value: any) { return this; }
  lt(column: string, value: any) { return this; }
  gt(column: string, value: any) { return this; }
  not(column: string, operator: string, value: any) { return this; }
  order(column: string, options?: any) { return this; }
  limit(count: number) { return this; }
  maybeSingle() { return this; }
  single() { return this; }

  then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any): Promise<any> {
    let responseData: any = null;

    if (this.updateValues) {
      if (this.table === "doctor_queue") {
        activeQueue = activeQueue.map(q => {
          if (this.filters.id && q.id === this.filters.id) {
            return { ...q, ...this.updateValues };
          }
          if (this.filters.patient_id && q.patient_id === this.filters.patient_id) {
            return { ...q, ...this.updateValues };
          }
          return q;
        });
        responseData = activeQueue.filter(q => q.id === this.filters.id || q.patient_id === this.filters.patient_id);
      }
    } else if (this.insertValues) {
      if (this.table === "prescriptions") {
        const newRx = {
          id: "fffe489a-630b-4655-bcfd-8fd240e534ec",
          created_at: new Date().toISOString(),
          clinic_id: "demo-clinic-id",
          ...this.insertValues
        };
        mockPrescriptions.push(newRx);
        responseData = newRx;
      } else if (this.table === "patients") {
        const newPt = { id: "p-new-" + Math.floor(Math.random() * 1000), ...this.insertValues };
        responseData = newPt;
      }
    } else {
      switch (this.table) {
        case "clinics":
          responseData = [mockClinic];
          break;
        case "doctors":
          responseData = mockDoctors;
          break;
        case "clinic_doctors":
          responseData = mockClinicDoctors;
          break;
        case "subscriptions":
          responseData = mockSubscription;
          break;
        case "receipts":
          responseData = mockReceipts;
          break;
        case "prescriptions":
          if (this.filters.id === "ae1163db-5002-4341-9cfe-535860ce2593") {
            responseData = {
              id: "ae1163db-5002-4341-9cfe-535860ce2593",
              created_at: new Date().toISOString(),
              clinic_id: "demo-clinic-id",
              patient_id: "p-rahul",
              doctor_id: "demo-doc-gopal",
              doctor_name: "Gopal Shukla",
              complaints: "Persistent dry cough, moderate chest tightness, and mild wheezing since 3 days.",
              findings: "Bilateral expiratory wheezing present on auscultation. Throat congested.",
              diagnosis: "Acute Bronchitis (Triggered by Dust Allergy)",
              medicines: JSON.stringify([
                {type:"Tab", name:"TAB. PARACETAMOL", dose:"650mg", freq:"1-0-1", dur:"3 Days", inst:"After Meal", note:"Take if fever exceeds 100F"},
                {type:"Tab", name:"TAB. CETIRIZINE", dose:"10mg", freq:"0-0-1", dur:"5 Days", inst:"After Meal", note:"May cause mild drowsiness. Take at bedtime."},
                {type:"Drop", name:"INHALER BUDECORT 200", dose:"200mcg", freq:"1 puff SOS", dur:"7 Days", inst:"Before Meal", note:"Rinse mouth with water after inhalation."}
              ]),
              advice: "Avoid cold food and drinks. Drink warm water. Do steam inhalation twice daily.",
              date: new Date().toISOString().split("T")[0],
              weight: "72",
              valid_till: new Date(Date.now() + 86400000 * 5).toISOString().split("T")[0],
              guidance_sheet: {
                understanding_condition: {
                  title: "Understanding Your Condition",
                  disease_name: "Acute Bronchitis (Triggered by Dust Allergy)",
                  points: [
                    "Acute bronchitis is an inflammation of the lungs' main breathing passages, causing dry cough and chest tightness.",
                    "In this case, the inflammation was triggered by dust inhalation, causing an allergic airway constriction."
                  ]
                },
                diet_nutrition: {
                  title: "Diet & Nutrition",
                  points: [
                    "Eat warm soups, ginger tea, and honey to soothe the throat and calm the cough reflex.",
                    "Avoid cold water, ice creams, fried food, and heavy dairy which increase phlegm."
                  ]
                },
                hydration: {
                  title: "Water & Hydration",
                  points: [
                    "Drink at least 2.5 to 3 liters of warm water daily to thin mucus and clear the chest.",
                    "Sip warm herbal infusions frequently to keep the throat moist."
                  ],
                  tip: "Keep a flask of warm water nearby and drink in small intervals."
                },
                activity_exercise: {
                  title: "Activity & Exercise",
                  points: [
                    "Take complete physical rest for the next 2-3 days to assist recovery.",
                    "Inhale steam twice daily for 5-10 minutes to open congested airways."
                  ],
                  tip: "Avoid high-intensity exercises until chest wheezing fully resolves."
                },
                things_to_avoid: {
                  title: "Things To Avoid",
                  items: [
                    { text: "Dust & Smoke Exposure", reason: "Directly triggers coughing fits and airway spasm." },
                    { text: "Cold beverages", reason: "Triggers throat reflex coughing." },
                    { text: "Aerosols & Air Sprays", reason: "Can trigger sudden asthmatic breathing difficulties." }
                  ]
                },
                warning_signs: {
                  title: "Warning Signs & Follow-up",
                  red_flags: [
                    "High fever (above 103F) or coughing blood-stained phlegm.",
                    "Noticeable shortness of breath, wheezing that prevents speaking, or blue lips."
                  ],
                  follow_up: "Revisit Shukla Care Clinic in 5 days (or immediately if warning signs develop)."
                },
                general_tips: [
                  "Wear a face mask when traveling or dusting.",
                  "Keep the living space clean, well-ventilated, and allergen-free."
                ]
              },
              ai_summary: {
                greeting: "Hello Rahul Verma",
                condition: "You have been diagnosed with Acute Bronchitis triggered by a dust allergy. This means your breathing tubes are inflamed and constricted.",
                medicines: [
                  { name: "TAB. PARACETAMOL 650mg", purpose: "reduce fever and body aches" },
                  { name: "TAB. CETIRIZINE 10mg", purpose: "control the allergic reaction and runny nose" },
                  { name: "INHALER BUDECORT 200", purpose: "relieve chest tightness and open up your airways" }
                ],
                expectations: "Your symptoms should start improving within 2-3 days with proper rest and medications.",
                care: "Take warm fluids, do steam inhalation, avoid cold foods and allergen exposure."
              }
            };
          } else {
            responseData = mockPrescriptions;
          }
          break;
        case "doctor_queue":
          responseData = activeQueue;
          break;
        case "patients":
          if (this.filters.id) {
            if (Array.isArray(this.filters.id)) {
              responseData = [
                { id: "p-rahul", name: "Rahul Verma", gender: "Male", age: 34, contact: "+91 98765 43210", blood_group: "O+", weight: "72", history: "Asthma, dust allergy" },
                { id: "p-priya", name: "Priya Sharma", gender: "Female", age: 29, contact: "+91 98765 43211", blood_group: "A+", weight: "58", history: "None" },
                { id: "p-amit", name: "Amit Singh", gender: "Male", age: 45, contact: "+91 98765 43212", blood_group: "B+", weight: "82", history: "Hypertension" }
              ].filter(p => this.filters.id.includes(p.id));
            } else {
              responseData = { id: "p-rahul", name: "Rahul Verma", gender: "Male", age: 34, contact: "+91 98765 43210", blood_group: "O+", weight: "72", history: "Asthma, dust allergy" };
            }
          } else {
            responseData = [
              { id: "p-rahul", name: "Rahul Verma", gender: "Male", age: 34, contact: "+91 98765 43210", blood_group: "O+", weight: "72", history: "Asthma, dust allergy" },
              { id: "p-priya", name: "Priya Sharma", gender: "Female", age: 29, contact: "+91 98765 43211", blood_group: "A+", weight: "58", history: "None" },
              { id: "p-amit", name: "Amit Singh", gender: "Male", age: 45, contact: "+91 98765 43212", blood_group: "B+", weight: "82", history: "Hypertension" }
            ];
          }
          break;
        default:
          responseData = [];
      }
    }

    const result = { data: responseData, error: null, count: Array.isArray(responseData) ? responseData.length : responseData ? 1 : 0 };
    return Promise.resolve(result).then(onfulfilled, onrejected);
  }
}

const getMockSession = () => {
  const payload = {
    exp: Math.floor(Date.now() / 1000) + 86400 * 365,
    email_confirmed_at: new Date().toISOString(),
    app_metadata: { email_verified: true }
  };
  const payloadB64 = typeof window !== "undefined"
    ? btoa(JSON.stringify(payload))
    : Buffer.from(JSON.stringify(payload)).toString("base64");
  
  const accessToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${payloadB64}.signature`;
  
  return {
    access_token: accessToken,
    user: {
      id: "demo-user-gopal",
      email: "shuklagopal1244@gmail.com",
      user_metadata: { name: "Gopal Shukla" }
    }
  };
};

export function getMockSupabaseClient() {
  return {
    auth: {
      getSession: () => Promise.resolve({ data: { session: getMockSession() }, error: null }),
      getUser: () => Promise.resolve({ data: { user: getMockSession().user }, error: null }),
      signInWithOAuth: (options: any) => {
        sessionStorage.setItem("is_demo_mode", "true");
        const prefix = typeof window !== "undefined" && window.location.pathname.startsWith("/demo1") ? "/demo1" : "/demo";
        setTimeout(() => {
          window.location.href = `${prefix}/portal`;
        }, 100);
        return Promise.resolve({ data: {}, error: null });
      },
      onAuthStateChange: (callback: any) => {
        // Send initial event
        setTimeout(() => callback("INITIAL_SESSION", { user: { id: "demo-user-gopal", email: "shuklagopal1244@gmail.com" } }), 10);
        return { data: { subscription: { unsubscribe: () => {} } } };
      },
      signOut: () => {
        sessionStorage.removeItem("is_demo_mode");
        document.cookie = "is_demo_mode=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        window.location.href = "/";
        return Promise.resolve({ error: null });
      }
    },
    from: (table: string) => {
      return new MockQueryBuilder(table);
    },
    channel: (name: string) => {
      return {
        on: () => { return { subscribe: () => {} }; },
        subscribe: () => {}
      };
    },
    removeChannel: () => {}
  };
}
