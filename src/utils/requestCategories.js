export const requestCategoryGroups = [
  {
    label: "Before the Storm",
    categories: ["Storm Preparations"]
  },
  {
    label: "During the Storm",
    categories: ["Adopt-A-Buddy", "Phone-A-Friend"]
  },
  {
    label: "After the Storm",
    categories: [
      "Cleanup",
      "Borrow or Donate Supplies",
      "Grocery Store Driver",
      "Donate a Dish"
    ]
  }
];

export const requestCategories = requestCategoryGroups.flatMap((group) => group.categories);

export const DONATE_A_DISH_CATEGORY = "Donate a Dish";
export const REQUEST_MEAL_CATEGORY = "Request a Meal";

export const dishVolunteerOptions = [
  {
    value: "Dish",
    description:
      "Create a dish, donate plates, gallon bags and shelf stable food. Drop-off at a designated location."
  },
  {
    value: "Food Prep",
    description: "Assist with meal preparation at a designated location."
  },
  {
    value: "Driver",
    description:
      "Pickup prepared meals and deliver to the identified residents."
  }
];

export const assistanceRequestCategoryGroups = requestCategoryGroups.map((group) => ({
  ...group,
  categories: group.categories.map((category) =>
    category === DONATE_A_DISH_CATEGORY ? REQUEST_MEAL_CATEGORY : category
  )
}));

export const requestCategoryLabels = {
  "Donate a Dish": "Request a Meal"
};

export function getRequestCategoryLabel(category) {
  return requestCategoryLabels[category] || category;
}

export const categoryAbbreviations = {
  "Storm Preparations": "Pre-Storm Prep",
  "Adopt-A-Buddy": "Adopt-A-Buddy",
  "Phone-A-Friend": "Phone-A-Friend",
  Cleanup: "Cleanup",
  "Borrow or Donate Supplies": "Borrow or Donate Supplies",
  "Donate a Dish": "Donate a Dish",
  "Grocery Store Driver": "Grocery Store Driver"
};

export const categoryDescriptions = {
  "Storm Preparations": "Move furniture in the lanai close to the wall or inside, move outdoor planters/rock pipe covers.",
  "Adopt-A-Buddy": "Have a spare room, welcome a buddy during the storm. Register as a safe place or a buddy.",
  "Phone-A-Friend": "Want to stay home, but have a friend to check up on you",
  Cleanup: "Moving furniture and plants back, cutting up small fallen trees/bushes/limbs, moving debris to the curb, assist with bracing up bent trees, cleaning up the lawn.",
  "Borrow or Donate Supplies": "Donate or borrow supplies to assist in clean up. Borrowed supplies have to be LABELED with Name and Phone. Rake, saw, extension cords, garden gloves, chainsaw, ladder, shovel, lawn bags, tree bracing supplies and others. Hurricane Hearts is not liable for damaged supplies.",
  "Donate a Dish": "Activated 24hrs after an extended power outage. 1 meal per person a day during the outage.",
  "Request a Meal": "Activated 24hrs after an extended power outage. 1 meal per person a day during the outage.",
  "Grocery Store Driver": "Activated 24hrs after an extended power outage. Replenish refrigerated groceries."
};
