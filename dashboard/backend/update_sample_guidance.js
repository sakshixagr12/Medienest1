const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const run = async () => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const sampleGuidance = {
    "understanding_condition": {
      "title": "Understanding Your Condition",
      "disease_name": "Bronchial Asthma (Mild Persistent)",
      "points": [
        "Bronchial Asthma is a chronic condition where your airways swell, narrow, and produce extra mucus.",
        "This leads to symptoms like coughing, wheezing, shortness of breath, and chest tightness.",
        "With mild persistent asthma, symptoms occur more than twice a week but not daily, and nighttime flare-ups occur more than twice a month.",
        "Proper management helps prevent exacerbations and keeps you active."
      ]
    },
    "diet_nutrition": {
      "title": "Diet & Nutrition Guidelines",
      "points": [
        "Include magnesium-rich foods like spinach, pumpkin seeds, and almonds to help relax airway muscles.",
        "Eat foods rich in Vitamin D and C to boost lung function and immunity.",
        "Limit sodium intake to prevent fluid retention in lungs.",
        "Avoid cold food, artificial colors, and sulfites (found in dried fruits and processed food) which can trigger asthma."
      ]
    },
    "hydration": {
      "title": "Water & Hydration Guidelines",
      "points": [
        "Drink warm fluids like herbal tea or warm water throughout the day.",
        "Warm hydration thins out mucus and relaxes the bronchioles.",
        "Ensure a minimum intake of 2.5-3 liters of fluids daily unless advised otherwise."
      ],
      "tip": "Keep a bottle of lukewarm water handy and sip frequently to soothe your airways."
    },
    "activity_exercise": {
      "title": "Activity & Exercise Guidelines",
      "points": [
        "Perform gentle breathing exercises (like pranayama or diaphragmatic breathing) to expand lung capacity.",
        "Engage in low-impact activities like walking in warm, humid weather.",
        "Avoid vigorous exercise in cold, dry air as it can trigger bronchoconstriction."
      ],
      "tip": "Always carry your inhaler (if prescribed) during any physical activity or outdoor walks."
    },
    "things_to_avoid": {
      "title": "Things to Avoid & Triggers",
      "items": [
        {
          "text": "Exposure to dust, smoke, and pollen",
          "reason": "These are primary asthma triggers that cause immediate airway inflammation."
        },
        {
          "text": "Cold environments and sudden temperature changes",
          "reason": "Cold air causes the breathing passages to constrict rapidly, leading to wheezing."
        },
        {
          "text": "Vigorous activity in outdoor cold weather",
          "reason": "Increased respiratory rate in dry/cold conditions precipitates bronchospasm."
        }
      ]
    },
    "warning_signs": {
      "title": "Warning Signs & Emergency",
      "red_flags": [
        "Severe, persistent shortness of breath even at rest.",
        "Inability to speak full sentences in one breath.",
        "Bluish tint on lips or fingernails (cyanosis).",
        "No relief after using rescue inhaler."
      ],
      "follow_up": "Seek immediate emergency medical care if you experience any of these red flags."
    },
    "general_tips": [
      "Identify and keep a log of personal asthma triggers to prevent future episodes.",
      "Ensure your living area is free from mold, pet dander, and strong chemical odors.",
      "Always sit upright during breathing difficulties to facilitate better air inflow."
    ]
  };

  try {
    console.log("Updating test prescription guidance sheet...");
    const { data, error } = await supabase
      .from("prescriptions")
      .update({ guidance_sheet: sampleGuidance })
      .eq("id", "723188d2-c8f2-4603-9e29-e36f414ca651")
      .select();

    if (error) {
      console.error("Error updating:", error);
    } else {
      console.log("Success! Updated prescription:", data[0].id);
    }
  } catch (error) {
    console.error("Critical error:", error);
  }
};

run();
