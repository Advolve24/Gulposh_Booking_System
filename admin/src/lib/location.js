import { Country, State, City } from "country-state-city";

export const getAllCountries = () => {
  return Country.getAllCountries();  
};

export const getStatesByCountry = (countryCode) => {
  return State.getStatesOfCountry(countryCode);
};

export const getCitiesByState = (countryCode, stateCode) => {
  return City.getCitiesOfState(countryCode, stateCode);
};
