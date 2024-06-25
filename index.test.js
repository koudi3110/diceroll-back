const request = require("supertest");
const app = require("./src/app");

describe("POST /auth/signin", () => {
  test("Connexion nom d'utilisateur", (done) => {
    request(app)
      .post("/auth/signin")
      .send({
        username: "kdcl",
      })
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        expect(res.body.data.username).toEqual("kdcl");
        done();
      });
  });
});

describe("POST /auth/anonyme", () => {
  test("Connexion visiteur", (done) => {
    request(app)
      .get("/auth/anonyme")
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        expect(res.status).toEqual(200);
        done();
      });
  });
});

// describe("POST /s1/exercice3", () => {
//   test("Exercice 3 S1", (done) => {
//     request(app)
//       .post("/s1/exercice3")
//       .send({
//         n1: 2,
//         n2: 2,
//       })
//       .expect(200)
//       .end((err, res) => {
//         if (err) return done(err);
//         expect(res.body).toEqual([{ reponse: 4 }]);
//         done();
//       });
//   });
// });

// describe("POST /s1/exercice4", () => {
//   test("Exercice 4 S1", (done) => {
//     request(app)
//       .post("/s1/exercice4")
//       .send({
//         n1: 2,
//         n2: 2,
//       })
//       .expect(200)
//       .end((err, res) => {
//         if (err) return done(err);
//         expect(res.body).toEqual([{ reponse: 1 }]);
//         done();
//       });
//   });
// });
