export const requestCategoryGroups = [
  {
    label: "Before the Storm",
    categories: ["Storm Preparations"]
  },
  {
    label: "During the Storm",
    categories: ["Adopt-A-Buddy"]
  },
  {
    label: "After the Storm",
    categories: [
      "Cleanup",
      "Borrow or Donate Supplies",
      "Donate a Dish",
      "Grocery Store Driver"
    ]
  }
];

export const requestCategories = requestCategoryGroups.flatMap((group) => group.categories);

export const categoryAbbreviations = {
  "Storm Preparations": "Pre-Storm Prep",
  "Adopt-A-Buddy": "Adopt-A-Buddy",
  Cleanup: "Cleanup",
  "Borrow or Donate Supplies": "Borrow or Donate Supplies",
  "Donate a Dish": "Donate a Dish",
  "Grocery Store Driver": "Grocery Store Driver"
};

export const categoryDescriptions = {
  "Storm Preparations": "Before the Storm - willing to help with storm readiness tasks.",
  "Adopt-A-Buddy": "During the Storm - willing to be paired with a neighbor for check-ins and support.",
  Cleanup: "After the Storm - willing to help with cleanup tasks.",
  "Borrow or Donate Supplies": "After the Storm - willing to lend, borrow, or donate useful supplies.",
  "Donate a Dish": "After the Storm - willing to prepare or donate a meal.",
  "Grocery Store Driver": "After the Storm - willing to drive for grocery store trips or pickups."
};
