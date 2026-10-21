"use client";

import { useApp } from "./providers";

interface FAQItem {
  question: [string, string]; // [English, Hindi]
  answer: [string, string];   // [English, Hindi]
}

export const FAQ: FAQItem[] = [
  {
    question: [
      "What is the GS Hub BPSC PYQ Portal?",
      "GS Hub BPSC PYQ पोर्टल क्या है?"
    ],
    answer: [
      "A practice website for BPSC aspirants with previous year questions (PYQ) of BPSC Prelims, sorted by subject, topic and exam, with detailed solutions in Hindi and English.",
      "BPSC अभ्यर्थियों के लिए अभ्यास वेबसाइट, जिसमें BPSC प्रारंभिक परीक्षा के पिछले वर्षों के प्रश्न (PYQ) विषय, टॉपिक और परीक्षा के अनुसार, हिंदी और अंग्रेज़ी में विस्तृत व्याख्या के साथ हैं。"
    ]
  },
  {
    question: [
      "Which BPSC exams are covered?",
      "कौन-कौन सी BPSC परीक्षाएँ शामिल हैं?"
    ],
    answer: [
      "Previous year papers of BPSC Prelims from the 56th to the 71st exam, plus full-length PYQ tests, a daily current affairs quiz and test series.",
      "56वीं से 71वीं BPSC प्रारंभिक परीक्षा के प्रश्न, साथ में PYQ फुल लेंथ टेस्ट, डेली करेंट अफेयर्स क्विज़ और टेस्ट सीरीज़।"
    ]
  },
  {
    question: [
      "Is it available in Hindi?",
      "क्या यह हिंदी में उपलब्ध है?"
    ],
    answer: [
      "Yes. Every question, option and solution is available in both Hindi and English — switch with one tap.",
      "हाँ। हर प्रश्न, विकल्प और व्याख्या हिंदी और अंग्रेज़ी दोनों में है — एक टैप में भाषा बदलें।"
    ]
  },
  {
    question: [
      "How does the Mistake Notebook help?",
      "मिस्टेक नोटबुक कैसे मदद करती है?"
    ],
    answer: [
      "Every wrong answer is saved automatically, so you can revise only your mistakes. The Heat Map shows your weak subjects and topics.",
      "हर गलत उत्तर अपने आप सेव होता है, ताकि आप सिर्फ़ अपनी गलतियाँ दोहरा सकें। हीट मैप आपके कमज़ोर विषय और टॉपिक दिखाता है।"
    ]
  },
  {
    question: [
      "Where is the GS Hub offline centre?",
      "GS Hub का ऑफ़लाइन सेंटर कहाँ है?"
    ],
    answer: [
      "Road No. 2, Nala Road, near Dinkar Golambar, Rajendra Nagar, Patna, Bihar — 800016. Call or WhatsApp +91 82874 17384.",
      "रोड नं. 2, नाला रोड, दिनकर गोलंबर के पास, राजेंद्र नगर, पटना, बihar — 800016। कॉल या WhatsApp: +91 82874 17384।"
    ]
  }
];

export function HomeFaq() {
  const { lang } = useApp();
  const hi = lang === "hi";

  return (
    <section className="mb-10">
      <div className="container-page">
        <h2 className="mb-6 font-display text-2xl font-bold text-maroon">
          {hi ? "अक्सर पूछे जाने वाले प्रश्न" : "Frequently Asked Questions"}
        </h2>
        <div className="space-y-4">
          {FAQ.map(({ question, answer }, idx) => (
            <div key={idx} className="border-l-4 border-maroon pl-4">
              <h3 className="mb-2 font-semibold text-maroon">
                {question[hi ? 1 : 0]}
              </h3>
              <p className="text-stone-700">
                {answer[hi ? 1 : 0]}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}