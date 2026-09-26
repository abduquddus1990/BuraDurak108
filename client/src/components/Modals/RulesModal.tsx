import React, { useState } from 'react';
import { BookOpen, X } from 'lucide-react';
import { GameType } from '../../../../shared/src/types/game';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialGame?: GameType;
}

interface RuleSection {
  title: string;
  items: string[];
}

// Ilova ichidagi qoidalar (server dvijoklari aynan shu qoidalar bo'yicha ishlaydi)
const RULES: Record<GameType, { name: string; sections: RuleSection[] }> = {
  BURA: {
    name: '☕ Bura',
    sections: [
      {
        title: 'Kartalar va ochkolar',
        items: [
          'Kattalik tartibi: Tuz > 10 > Qirol > Dama > Valet > 9 > 8 > 7 > 6.',
          'Ochkolar: Tuz 11, 10 — 10, Qirol 4, Dama 3, Valet 2, qolganlari 0.',
          "Har bir o'yinchiga 4 tadan (6 talik qaytarmada 6 tadan) karta tarqatiladi. Kozir - oxiridan bitta oldingi ochiq karta.",
        ],
      },
      {
        title: 'Yurish',
        items: [
          "Bir yoki bir nechta bir xil mastdagi karta bilan yuriladi. Javob beruvchi xuddi shuncha karta tashlaydi.",
          "Hamma kartani ura olsa - uradi, aks holda kartalarni yopiq tashlaydi. Vzyatkani eng oxirgi urgan o'yinchi oladi.",
          "6 talik qaytarmada urilgan kartani birinchi yurgan o'yinchi yana qaytarib urishi mumkin.",
          "61 ochko to'plagan o'yinchi qo'lni yutadi.",
        ],
      },
      {
        title: 'Kombinatsiyalar',
        items: [
          "👑 Moskva (4 ta Tuz) - butun partiya darhol yutiladi.",
          "⚡ Bura (4 ta kozir, 6 talikda 5 ta) - qo'l yutiladi.",
          "🔨 Molodka (4 ta bir xil nokozir mast) - navbat kelganda hammasi bilan yuriladi.",
          "🎯 41+ (faqat 41 lik rejimda) - 41 dan ortiq ochkoli kartalar bilan yurish.",
        ],
      },
      {
        title: 'Jarimalar va Tuxum',
        items: [
          "Qo'lni yutqazganda: 0 ochko - 6, 31 dan kam - 4, 31 va undan ko'p - 2 jarima. 12 jarimaga yetgan partiyani yutqazadi.",
          "🥚 Tuxum: eng ko'p ochko teng bo'lsa, jarima yozilmaydi, qo'l qayta tarqatiladi va keyingi qo'l jarimalari x2 bo'ladi (yana tuxum - x4).",
        ],
      },
    ],
  },
  DURAK: {
    name: '🛡️ Durak',
    sections: [
      {
        title: 'Asosiy qoidalar',
        items: [
          "36 ta karta, har kimga 6 tadan. Kozir - koloda tagidagi ochiq karta. Birinchi eng kichik kozirli o'yinchi yuradi.",
          "Himoyachi har bir kartani katta karta yoki kozir bilan uradi. Ura olmasa - stoldagi hamma kartani oladi.",
          "Faqat himoyachining ikki yonidagi o'yinchilar karta tashlaydi (stoldagi nominallar bilan).",
          "Hujum ikkala qo'shni ham \"Bita\" deganidan keyin tugaydi. Oxirida kartasi qolgan o'yinchi - durak.",
        ],
      },
      {
        title: 'Perekidli (Perevodnoy)',
        items: [
          "Himoyachi hali hech narsa urmagan bo'lsa, xuddi shu nominaldagi karta qo'yib hujumni keyingi o'yinchiga o'tkaza oladi.",
          "Durak'da urish uchun avval qo'lingizdan kartani, keyin stoldagi nishon kartani bosing.",
        ],
      },
    ],
  },
  ONE_HUNDRED_EIGHT: {
    name: "🎯 108",
    sections: [
      {
        title: 'Yurish',
        items: [
          "Har kimga 4 tadan karta. Stoldagi karta masti yoki nominaliga mos karta tashlanadi, mos karta bo'lmasa bozordan olinadi.",
          "6 - keyingi o'yinchi 1 ta, 7 - 2 ta karta oladi (6/7 bilan zanjirni davom ettirish mumkin). 8 - yana o'zingiz yurasiz. Tuz - keyingi o'yinchi navbatini o'tkazadi.",
          "1-variant (Qarg'a Qiroli): ♠ Qirol - keyingi o'yinchi 4 ta karta oladi; Valet mast buyurtma qiladi.",
          "2-variant (Olma Qiroli): ♥ Qirol - keyingi o'yinchi 5 ta karta oladi; Dama mast buyurtma qiladi.",
          "Eng ko'p ochkoli o'yinchi tarqatadi, undan keyingisi birinchi yuradi.",
        ],
      },
      {
        title: 'Ochkolar',
        items: [
          "Kartasidan birinchi qutulgan o'yinchi qo'lni yutadi, raund darhol tugaydi.",
          "Qo'lda qolgan kartalar: Tuz 11, 10 — 10, Qirol 4, Dama 3, Valet 2, 9/8/7/6 - o'z qiymati.",
          "Dama qo'lda yolg'iz qolsa - 20, Qarg'a (♠) damasi - 40 ochko.",
          "Oxirgi kartasi dama bo'lib chiqqan o'yinchidan -20 (♠ dama -40) ayriladi, ochko manfiy ham bo'lishi mumkin.",
          "Aynan 108 bo'lsa - ochko 0 ga tushadi. 108 dan oshsa - o'yindan chiqadi.",
        ],
      },
    ],
  },
};

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose, initialGame = 'BURA' }) => {
  const [game, setGame] = useState<GameType>(initialGame);
  if (!isOpen) return null;
  const rules = RULES[game];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-md bg-stone-900 border-2 border-amber-500 rounded-3xl p-5 shadow-2xl flex flex-col gap-3 relative max-h-[85vh] anim-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-stone-400 hover:text-white p-1">
          <X className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-amber-400" />
          <h2 className="text-base font-black text-amber-200 font-serif">O'yin Qoidalari</h2>
        </div>

        <div className="grid grid-cols-3 gap-1 bg-stone-800/90 p-1 rounded-2xl border border-stone-700">
          {(Object.keys(RULES) as GameType[]).map((g) => (
            <button
              key={g}
              onClick={() => setGame(g)}
              className={`py-1.5 rounded-xl text-xs font-bold transition ${game === g ? 'bg-amber-500 text-stone-950 shadow' : 'text-stone-400 hover:text-white'}`}
            >
              {RULES[g].name}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 overflow-y-auto pr-1 no-scrollbar">
          {rules.sections.map((section) => (
            <div key={section.title} className="bg-stone-800/60 border border-stone-700 rounded-2xl p-3">
              <h3 className="text-xs font-black text-amber-300 mb-1.5">{section.title}</h3>
              <ul className="flex flex-col gap-1.5">
                {section.items.map((item, i) => (
                  <li key={i} className="text-[12px] text-stone-200 leading-snug flex gap-1.5">
                    <span className="text-amber-500">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
