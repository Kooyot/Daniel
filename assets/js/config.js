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
    avatar: "",
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
      url: "#", // np. "mailto:kontakt@twojadomena.pl"
    },
  ],

  motto: "Forma nie bierze się z motywacji. Bierze się z powtórzeń.",
  footer: "Trener personalny · Kulturysta",

  // Animacja „uginanie z hantlem” przed przejściem na link
  redirect: { enabled: true, delay: 1250 },

  // Ekran ładowania z ludzikiem podnoszącym sztangę
  loader: { enabled: true, minDuration: 2300, repeatVisitDuration: 1000 },
};
