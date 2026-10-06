/* =====================================================================
   KONFIGURACJA STRONY — wszystkie treści edytujesz TYLKO tutaj 💪
   ---------------------------------------------------------------------
   • url: ""   → element jest ukryty
   • url: "#"  → element widoczny, po kliknięciu pokazuje „Link wkrótce”
   • url: "#online" (klucz z forms) → otwiera formularz w wysuwanym panelu
   • newTab: true → link otwiera się w nowej karcie (bez animacji przekierowania)
   • Dostępne ikony: instagram, tiktok, youtube, facebook, mail, phone, chat,
     dumbbell, clipboard, calendar, apple, trophy, star, link
   ===================================================================== */
window.SITE_CONFIG = {
  profile: {
    firstName: "Daniel",
    lastName: "Staszak",
    handle: "@danielstaszak_",
    role: "Trener personalny · Kulturysta",
    bio: "12 lat na siłowni. Zjadłem na niej zęby — teraz pomagam Ci zbudować formę bez dróg na skróty.",
    // Ścieżka do zdjęcia, np. "assets/img/daniel.jpg". Puste = monogram „DS”.
    avatar: "assets/img/daniel.jpg",
    status: { show: true, text: "Przyjmuję nowych podopiecznych" },
  },

  stats: [
    { value: "12+", label: "lat na siłowni" },
    { value: "1:1", label: "treningi personalne" },
    { value: "Online", label: "prowadzenie" },
  ],

  socials: [
    { icon: "instagram", label: "Instagram", url: "https://www.instagram.com/danielstaszak_/" },
    { icon: "tiktok", label: "TikTok", url: "https://www.tiktok.com/@danielstaszak_" },
    { icon: "youtube", label: "YouTube", url: "https://www.youtube.com/@DanielStaszak99" },
    { icon: "facebook", label: "Facebook", url: "#" },
    { icon: "mail", label: "E-mail", url: "mailto:kontakt@danielstaszak.pl" },
  ],

  links: [
    { type: "heading", text: "Współpraca" },
    {
      title: "Prowadzenie online",
      subtitle: "Plan treningowy, dieta i stały kontakt",
      icon: "clipboard",
      url: "#online", // otwiera formularz z forms.online
      featured: true,
      badge: "Polecane",
    },
    {
      title: "Treningi personalne 1:1",
      subtitle: "Umów pierwszy trening na sali",
      icon: "dumbbell",
      url: "#treningi", // otwiera formularz z forms.treningi
    },
    {
      title: "Konsultacja",
      subtitle: "Porozmawiajmy o Twoim celu",
      icon: "calendar",
      url: "#konsultacja", // otwiera formularz z forms.konsultacja
    },

    { type: "heading", text: "Social media" },
    {
      title: "Instagram",
      subtitle: "@danielstaszak_ · treningi i kulisy",
      icon: "instagram",
      url: "https://www.instagram.com/danielstaszak_/",
    },
    { title: "TikTok", subtitle: "@danielstaszak_ · krótkie porady treningowe", icon: "tiktok", url: "https://www.tiktok.com/@danielstaszak_" },
    { title: "YouTube", subtitle: "@DanielStaszak99 · pełne treningi i vlogi", icon: "youtube", url: "https://www.youtube.com/@DanielStaszak99" },

    { type: "heading", text: "Kontakt" },
    {
      title: "Napisz do mnie",
      subtitle: "Współpraca, pytania · e-mail lub DM na Instagramie",
      icon: "chat",
      url: "#napisz", // otwiera okno kontaktu (ustawienia w contact poniżej)
    },
  ],

  // Okno „Napisz do mnie”: temat + wiadomość, wysyłka z własnego maila albo w DM na Instagramie.
  // Nic nie przechodzi przez stronę — otwiera się program pocztowy albo czat na Instagramie.
  contact: {
    key: "napisz", // adres: twojadomena.pl/#napisz
    title: "Napisz do mnie",
    subtitle: "Współpraca, reklama albo pytanie? Napisz, jak Ci wygodniej — odpowiadam na każdą wiadomość.",
    email: "kontakt@danielstaszak.pl",
    instagram: "danielstaszak_",
    topics: ["Współpraca / reklama", "Pytanie", "Inne"],
    placeholder: "Napisz krótko, o co chodzi…",
  },

  // Serwer formularzy na Hetznerze (zapis w panelu Daniela, limit po IP / e-mailu / telefonie).
  // Gdy nie odpowiada, formularze awaryjnie wysyłają zgłoszenie przez Web3Forms (poniżej).
  api: {
    submit: "/api/submit",
  },

  // Formularze (Web3Forms — zgłoszenia trafiają na e-mail podpięty w Web3Forms).
  // accessKey: klucz z https://web3forms.com (jest publiczny, może być w kodzie).
  web3forms: {
    accessKey: "f7038138-f481-4b16-a1a5-04cad059d5b9",
    fromName: "Strona Daniel Staszak", // nadawca maila, który dostajesz
    successTitle: "Zgłoszenie wysłane!",
    successText: "Dzięki — odezwę się najszybciej, jak to możliwe.",
  },

  // Ochrona przed spamem (działa w przeglądarce):
  // • jedna osoba (urządzenie/przeglądarka) = jedno zgłoszenie na lockHours godzin (0 = na zawsze)
  // • ukryte pole-pułapka na boty i minimalny czas wypełniania formularza
  // • e-mail i telefon są obowiązkowe w każdym formularzu
  antispam: {
    onePerPerson: true,
    lockHours: 24,
    minSeconds: 4,
    lockedText: "Jedna osoba może wysłać jedno zgłoszenie — odezwę się do Ciebie. Jeśli chcesz coś dodać, napisz na Instagramie.",
  },

  /* Każdy formularz:
     • klucz (np. online) = adres linku: "#online" w links otwiera ten formularz,
       działa też bezpośredni link: twojadomena.pl/#online
     • subject — temat maila; {name} i {Etykieta pola} zostaną podmienione
     • fields — pola formularza:
         type: "text" | "email" | "tel" | "textarea" — zwykłe pole
               "choice" — wybór jednej opcji (pigułki), "multi" — kilka opcji
         key: "name" / "email" — tylko dla imienia i e-maila (odpowiedź do klienta)
         required: true — pole obowiązkowe, half: true — pół szerokości na komputerze
     • show: false — ukrywa formularz */
  forms: {
    online: {
      title: "Prowadzenie online",
      subtitle: "Plan treningowy, dieta i stały kontakt. Opowiedz mi o sobie — przygotuję ofertę pod Ciebie.",
      icon: "clipboard",
      button: "Chcę współpracować",
      subject: "Prowadzenie online — {name}",
      fields: [
        { key: "name", label: "Imię", type: "text", required: true, autocomplete: "given-name", placeholder: "Jak masz na imię?" },
        { key: "email", label: "E-mail", type: "email", required: true, half: true, autocomplete: "email", placeholder: "ty@przyklad.pl" },
        { label: "Telefon", type: "tel", required: true, half: true, autocomplete: "tel", placeholder: "+48 …" },
        { label: "Twój cel", type: "choice", options: ["Redukcja", "Budowa masy", "Rekompozycja", "Siła", "Zdrowie i forma"] },
        { label: "Doświadczenie", type: "choice", options: ["Początkujący", "Średniozaawansowany", "Zaawansowany"] },
        { label: "Ile dni w tygodniu możesz trenować?", type: "choice", options: ["2", "3", "4", "5+"] },
        { label: "Gdzie trenujesz?", type: "choice", options: ["Siłownia", "Dom", "Plener"] },
        { label: "Wiek, wzrost, waga", type: "text", placeholder: "np. 28 lat, 180 cm, 85 kg" },
        { label: "Coś, o czym powinienem wiedzieć?", type: "textarea", placeholder: "Kontuzje, praca zmianowa, dotychczasowe treningi, dieta…" },
      ],
    },

    treningi: {
      title: "Treningi personalne 1:1",
      subtitle: "Trening ze mną na sali. Zostaw kontakt — ustalimy termin pierwszego treningu.",
      icon: "dumbbell",
      button: "Umów trening",
      subject: "Trening 1:1 — {name}",
      fields: [
        { key: "name", label: "Imię", type: "text", required: true, autocomplete: "given-name", placeholder: "Jak masz na imię?" },
        { label: "Telefon", type: "tel", required: true, half: true, autocomplete: "tel", placeholder: "+48 …" },
        { key: "email", label: "E-mail", type: "email", required: true, half: true, autocomplete: "email", placeholder: "ty@przyklad.pl" },
        { label: "Cel", type: "choice", options: ["Redukcja", "Budowa masy", "Technika ćwiczeń", "Siła", "Powrót do formy"] },
        { label: "Preferowane dni", type: "multi", options: ["Pon", "Wt", "Śr", "Czw", "Pt", "Sob", "Nd"] },
        { label: "Preferowana pora", type: "multi", options: ["Rano", "Południe", "Popołudnie", "Wieczór"] },
        { label: "Wiadomość", type: "textarea", placeholder: "Doświadczenie, kontuzje, pytania…" },
      ],
    },

    konsultacja: {
      title: "Konsultacja",
      subtitle: "Porozmawiajmy o Twoim celu — trening, dieta, plan działania.",
      icon: "calendar",
      button: "Umów konsultację",
      subject: "Konsultacja: {Forma konsultacji} — {name}",
      fields: [
        { key: "name", label: "Imię", type: "text", required: true, autocomplete: "given-name", placeholder: "Jak masz na imię?" },
        { key: "email", label: "E-mail", type: "email", required: true, half: true, autocomplete: "email", placeholder: "ty@przyklad.pl" },
        { label: "Telefon", type: "tel", required: true, half: true, autocomplete: "tel", placeholder: "+48 …" },
        { label: "Forma konsultacji", type: "choice", options: ["Online (wideo)", "Na sali", "Telefonicznie"] },
        { label: "Temat", type: "multi", options: ["Trening", "Dieta", "Suplementacja", "Przygotowanie do zawodów", "Inne"] },
        { label: "Z czym przychodzisz?", type: "textarea", required: true, placeholder: "Opisz krótko swoją sytuację i cel." },
      ],
    },
  },

  motto: "Forma nie bierze się z motywacji. Bierze się z powtórzeń.",
  footer: "Trener personalny · Kulturysta",

  // Animacja „uginanie z hantlem” przed przejściem na link
  redirect: { enabled: true, delay: 1250 },

  // Ekran ładowania z ludzikiem podnoszącym sztangę
  loader: { enabled: true, minDuration: 2300, repeatVisitDuration: 1000 },
};
