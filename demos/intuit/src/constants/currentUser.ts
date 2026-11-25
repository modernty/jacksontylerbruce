export const JENNIFER = {
  name: 'Jennifer Allan',
  email: 'jennifer.allan@gmail.com',
};

export const LUIGI = {
  name: "Luigi's Catering",
  email: 'hello@luigiscatering.com',
};

// Mutable active user — switches between text (Jennifer) and voice (Luigi) routes.
// ES module live-binding ensures any file that imports CURRENT_USER reads the latest value.
export let CURRENT_USER = JENNIFER;

export function setActiveUser(user: typeof JENNIFER) {
  CURRENT_USER = user;
}
