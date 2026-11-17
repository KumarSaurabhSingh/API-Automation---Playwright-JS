const { randomString, randomInt, randomEmail } = require('../utils/data-generator');

class UserBuilder {
  constructor() {
    this.reset();
  }

  reset() {
    this.payload = {
      firstName: `QA${randomString(4)}`,
      lastName: 'Automation',
      age: randomInt(21, 65),
      gender: 'female',
      email: randomEmail('qa.user'),
      phone: `+1-${randomInt(200, 999)}-${randomInt(100, 999)}-${randomInt(1000, 9999)}`,
      username: `qa_${randomString(8)}`,
      password: 'Str0ng!Passw0rd',
      birthDate: '1995-05-15',
      image: 'https://dummyjson.com/icon/emilys/128',
      address: {
        address: `${randomInt(1, 999)} Automation Street`,
        city: 'Testville',
        state: 'Test State',
        stateCode: 'TS',
        postalCode: `${randomInt(10000, 99999)}`,
        country: 'United States',
      },
    };
    return this;
  }

  with(overrides) {
    this.payload = { ...this.payload, ...overrides };
    return this;
  }

  withFirstName(firstName) {
    this.payload.firstName = firstName;
    return this;
  }

  withEmail(email) {
    this.payload.email = email;
    return this;
  }

  withoutPassword() {
    delete this.payload.password;
    return this;
  }

  build() {
    return structuredClone(this.payload);
  }
}

module.exports = UserBuilder;
