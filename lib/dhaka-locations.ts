export type BDArea = {
  name: string;
  subAreas?: string[];
};

export type BDAreaGroup = {
  label: string;
  areas: BDArea[];
};

export const BD_AREAS: BDAreaGroup[] = [
  {
    label: "Dhaka",
    areas: [
      { name: "Gulshan", subAreas: ["Gulshan 1", "Gulshan 2", "Gulshan Avenue"] },
      { name: "Banani", subAreas: ["Banani", "Banani DOHS"] },
      {
        name: "Baridhara",
        subAreas: ["Baridhara", "Baridhara DOHS", "Baridhara Diplomatic Zone"],
      },
      {
        name: "Bashundhara R/A",
        subAreas: [
          "Block A",
          "Block B",
          "Block C",
          "Block D",
          "Block E",
          "Block F",
          "Block G",
        ],
      },
      { name: "Dhanmondi" },
      {
        name: "Mirpur",
        subAreas: [
          "Mirpur 1",
          "Mirpur 2",
          "Mirpur 6",
          "Mirpur 10",
          "Mirpur 11",
          "Mirpur 12",
          "Mirpur 13",
          "Mirpur 14",
          "Mirpur DOHS",
        ],
      },
      {
        name: "Uttara",
        subAreas: [
          "Sector 1",
          "Sector 2",
          "Sector 3",
          "Sector 4",
          "Sector 5",
          "Sector 6",
          "Sector 7",
          "Sector 8",
          "Sector 9",
          "Sector 10",
          "Sector 11",
          "Sector 12",
          "Sector 13",
          "Sector 14",
          "Uttara DOHS",
        ],
      },
      { name: "Mohakhali", subAreas: ["Mohakhali", "Mohakhali DOHS"] },
      { name: "Tejgaon" },
      { name: "Farmgate" },
      { name: "Rampura" },
      { name: "Banasree" },
      { name: "Aftabnagar" },
      { name: "Badda" },
      { name: "Mohammadpur" },
      { name: "Lalmatia" },
      { name: "Shyamoli" },
      { name: "Adabar" },
      { name: "Khilgaon" },
      { name: "Pallabi" },
      {
        name: "Old Dhaka",
        subAreas: ["Lalbagh", "Sutrapur", "Kotwali"],
      },
    ],
  },
  {
    label: "Other Divisions",
    areas: [
      {
        name: "Chattogram",
        subAreas: ["GEC", "Khulshi", "Agrabad", "Halishahar"],
      },
      { name: "Sylhet" },
      { name: "Khulna" },
      { name: "Rajshahi" },
    ],
  },
];
