/* =====================================================================
   KONFIGURACJA STRONY — wszystkie treści edytujesz TYLKO tutaj 💪
   ---------------------------------------------------------------------
   • url: ""   → element jest ukryty
   • url: "#"  → element widoczny, po kliknięciu pokazuje „Link wkrótce”
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
    bio: "15 lat na siłowni. Zjadłem na niej zęby — teraz pomagam Ci zbudować formę bez dróg na skróty.",
    // Ścieżka do zdjęcia, np. "assets/img/daniel.jpg". Puste = monogram „DS”.
    avatar: "assets/img/daniel.jpg",
    status: { show: true, text: "Przyjmuję nowych podopiecznych" },
  },

  stats: [
    { value: "15+", label: "lat na siłowni" },
    { value: "1:1", label: "treningi personalne" },
    { value: "Online", label: "prowadzenie" },
  ],

  socials: [
    { icon: "instagram", label: "Instagram", url: "https://www.instagram.com/danielstaszak_/" },
    { icon: "tiktok", label: "TikTok", url: "#" },
    { icon: "youtube", label: "YouTube", url: "#" },
    { icon: "facebook", label: "Facebook", url: "#" },
    { icon: "mail", label: "E-mail", url: "#" },
  ],

  links: [
    { type: "heading", text: "Współpraca" },
    {
      title: "Prowadzenie online",
      subtitle: "Plan treningowy, dieta i stały kontakt",
      icon: "clipboard",
      url: "#",
      featured: true,
      badge: "Polecane",
    },
    {
      title: "Treningi personalne 1:1",
      subtitle: "Umów pierwszy trening na sali",
      icon: "dumbbell",
      url: "#",
    },
    {
      title: "Konsultacja",
      subtitle: "Porozmawiajmy o Twoim celu",
      icon: "calendar",
      url: "#",
    },

    { type: "heading", text: "Social media" },
    {
      title: "Instagram",
      subtitle: "@danielstaszak_ · treningi i kulisy",
      icon: "instagram",
      url: "https://www.instagram.com/danielstaszak_/",
    },
    { title: "TikTok", subtitle: "Krótkie porady treningowe", icon: "tiktok", url: "#" },
    { title: "YouTube", subtitle: "Pełne treningi i vlogi", icon: "youtube", url: "#" },

    { type: "heading", text: "Kontakt" },
    {
      title: "Napisz do mnie",
      subtitle: "Odpowiadam na każdą wiadomość",
      icon: "mail",
      url: "#kontakt", // przewija do formularza poniżej
    },
  ],

  // Formularz kontaktowy (Web3Forms — wiadomości trafiają na Twój e-mail).
  // accessKey: klucz z https://web3forms.com (jest publiczny, można go tu wpisać).
  // Puste accessKey = formularz widoczny, ale wysyłka jeszcze nieaktywna.
  // show: false = formularz całkowicie ukryty.
  contact: {
    show: true,
    accessKey: "f7038138-f481-4b16-a1a5-04cad059d5b9",
    heading: "Formularz",
    title: "Napisz do mnie",
    subtitle: "Odpowiadam na każdą wiadomość",
    topics: ["Prowadzenie online", "Treningi 1:1", "Konsultacja", "Inne"],
    // Temat maila, który dostaniesz. {topic} i {name} zostaną podmienione.
    emailSubject: "Nowe zgłoszenie: {topic} — {name}",
    emailFromName: "Strona Daniel Staszak",
    successTitle: "Wiadomość wysłana!",
    successText: "Dzięki — odezwę się najszybciej, jak to możliwe.",
  },

  motto: "Forma nie bierze się z motywacji. Bierze się z powtórzeń.",
  footer: "Trener personalny · Kulturysta",

  // Animacja „uginanie z hantlem” przed przejściem na link
  redirect: { enabled: true, delay: 1250 },

  // Ekran ładowania z ludzikiem podnoszącym sztangę
  loader: { enabled: true, minDuration: 2300, repeatVisitDuration: 1000 },
};
