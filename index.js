const express = require("express");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const mongoose = require("mongoose");
const fetch = require("node-fetch");
const session = require("express-session");
const axios = require("axios");
const http = require("https");
const State = require("country-state-city").State;
const { Vonage } = require("@vonage/server-sdk");

const { City } = require("country-state-city");

const path = require("path");

require("dotenv").config();
const app = express();
app.use(express.json());

app.set("view engine", "ejs");

app.set("views", path.join(__dirname, "views"));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static("public"));
app.use(
  session({
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized: true,
  })
);

mongoose.connect(
  "mongodb+srv://amit786:6baGJ5rTtCxuf7x9@cluster0.cfyuqjy.mongodb.net/?retryWrites=true&w=majority",
  { useNewUrlParser: true }
);

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
});

const RegisteredHospital = new mongoose.Schema({
  hospitalName: String,
  hospitalAddress: String,
  password: String,
  patient: [
    {
      patientName: String,
      patientNum: String,
      patientAddress: String,
      patientStatus: String,
      ambuTrack: String,
    },
  ],
  driver: [
    {
      driverName: String,
      driverNum: String,
      driverId: String,
      driverPass: String,
      driverStatus: String,
      patientAssign: String,
    },
  ],
});

const hospitallist = mongoose.model("hospitallist", RegisteredHospital);

const user = mongoose.model("user", userSchema);

const vonage = new Vonage({
  apiKey: process.env.VONAGE_API_KEY,
  apiSecret: process.env.VONAGE_API_SECRET,
});

app.get("/", (req, res) => {
  res.render("home");
});
app.get("/service", (req, res) => {
  res.render("service");
});
app.get("/features", (req, res) => {
  res.render("features");
});
app.get("/aboutUs", (req, res) => {
  res.render("aboutus");
});
app.get("/contactus", (req, res) => {
  res.render("contactus");
});

app.get("/book", (req, res) => {
  res.render("bookNow");
});

app.post("/message", (req, res) => {
  // Extract data from the request body
  const name = req.body.name;
  const email = req.body.email;
  const msg = req.body.msg;

  // Create a nodemailer transporter
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.NODEMAILER_EMAIL,
      pass: process.env.NODEMAILER_PASS,
    },
    port: 465,
    host: "smtp.gmail.com",
  });

  // Define mail options for sending emails to the user
  const mailOption1 = {
    from: process.env.NODEMAILER_EMAIL,
    to: `${email}`,
    subject: "Ambulance Tracker customer care",
    text: "Thanks For Contacting Us " + `${name}`,
  };

  // Define mail options for sending emails to a second email address
  const mailOption2 = {
    from: process.env.NODEMAILER_EMAIL,
    to: process.env.SECOND_EMAIL,
    subject: `${name}`,
    text:
      "name:- " +
      `${name}` +
      "\n email:- " +
      `${email}` +
      "\n message:- " +
      `${msg}`,
  };

  // Send the first email to the user
  transporter.sendMail(mailOption1, (error, info) => {
    if (error) {
      console.log(error);
      res.send("error sending email");
    } else {
      // If the first email is sent successfully, send the second email
      transporter.sendMail(mailOption2, (error, info) => {
        if (error) {
          console.log(error);
          res.send("error sending email");
        } else {
          // If both emails are sent successfully, save user data to the database
          user
            .findOne({ email: email })
            .then(function (elem) {
              if (!elem) {
                const newUser = new user({
                  name: name,
                  email: email,
                });
                newUser.save();
              }
            })
            .catch((err) => {
              console.log(err);
            });

          // Render a response page (assumes you have a "message" view set up)
          res.render("message");
        }
      });
    }
  });
});

app.post("/book", (req, res) => {
  var number = req.body.phone;
  var username = req.body.Name;
  console.log(number);
  console.log(username);
  console.log(req.session.smsSent);

  // Check if SMS has already been sent for this session
  if (req.session.smsSent) {
    // SMS has already been sent, render the verify page without sending another SMS

    res.render("verify", {
      number: number,
      username: username,
      code: req.session.code,
    });
  } else {
    var code = Math.floor(Math.random() * 999999);
    const from = "Medical Team";
    const to = "+91" + number;
    const text =
      "hlo " + username + " this is your verification code:- " + code;

    async function sendSMS() {
      await vonage.sms
        .send({ to, from, text })
        .then((resp) => {
          console.log("Message sent successfully");
          console.log(resp);
          // Set the flag and code in session to indicate that SMS has been sent
          req.session.smsSent = true;
          req.session.code = code;
          res.render("verify", {
            number: number,
            username: username,
            code: code,
          });
        })
        .catch((err) => {
          console.log("There was an error sending the messages.");
          console.log();
          console.error(err);
          res.render("error", { error: err });
        });
    }

    sendSMS();
  }
});

// app.post("/verify", (req, res) => {
//   var userName = req.body.userName;
//   var phoneNumber = req.body.phoneNumber;
//   var enterCode = req.body.code;
//   var code = req.body.realCode;
//   var count = 0;
//   if (enterCode == code) {
//     var allState = State.getStatesOfCountry("IN");
//     var allCities = {};
//     for (var i = 0; i < allState.length; i++) {
//       var city = City.getCitiesOfState("IN", allState[i].isoCode);
//       allCities[allState[i].name] = city;
//     }
//     var allCitiesString = JSON.stringify(allCities);
//     res.render("location", {
//       allState: allState,
//       allCitiesString: allCitiesString,
//       userName: userName,
//       phoneNumber: phoneNumber,
//     });
//   } else {
//     count++;
//     if (count == 3) {
//       res.redirect("/book");
//     } else {
//       res.render("verify", { Username: userName, number: phoneNumber });
//     }
//   }
// });
app.post("/verify", async (req, res) => {
  try {
    // ... (existing code)
    var userName = req.body.userName;
    var phoneNumber = req.body.phoneNumber;
    var enterCode = req.body.code;
    var code = req.body.realCode;
    var count = 0;
    if (enterCode === code) {
      const allState = await State.getStatesOfCountry("IN");

      // Ensure that allState is an array and has at least one state
      if (Array.isArray(allState) && allState.length > 0) {
        // Get the cities for the first state in the list
        const stateIsoCode = allState[0].isoCode;
        const cities = await City.getCitiesOfState("IN", stateIsoCode);

        // Convert cities to JSON string
        const allCitiesString = JSON.stringify(cities);

        // Render the "location" page with the state and cities
        res.render("location", {
          allState: allState,
          allCitiesString: cities, // Pass allCitiesString as a local variable
          userName: userName,
          phoneNumber: phoneNumber,
        });
      } else {
        console.log("No states found for the country.");
        res.render("error", { error: "No states found for the country" });
      }
    } else {
      // ... (existing code)
    }
  } catch (error) {
    console.error("Error in /verify route:", error);
    res.render("error", { error: "Internal server error" });
  }
});

app.post("/location", async (req, res) => {
  try {
    var latitude;
    var longitude;
    var userName = req.body.userName;
    var phoneNumber = req.body.phoneNumber;
    var state = req.body.state;
    var city = req.body.city;
    var apiUrl = "https://nominatim.openstreetmap.org/search";
    var params = {
      q: city + "-" + state,
      format: "json",
      limit: 1,
    };
    // console.log(`params = ${params} `);
    console.log("params:", JSON.stringify(params, null, 2));

    var queryString = Object.keys(params)
      .map(function (key) {
        return encodeURIComponent(key) + "=" + encodeURIComponent(params[key]);
      })
      .join("&");

    var url = apiUrl + "?" + queryString;
    console.log(`url = ${url} `);

    var response = await fetch(url);
    // console.log(`response = ${response} `);
    console.log("Response:", JSON.stringify(response, null, 2));

    const data = await response.json();
    // console.log(`data = ${data} `);
    console.log("Data:", JSON.stringify(data, null, 2));

    if (data.length > 0) {
      latitude = data[0].lat;
      longitude = data[0].lon;
    } else {
      console.log("Coordinates not found for the specified location.");
    }

    function hospitalCall() {
      const options = {
        method: "GET",
        hostname: "api.foursquare.com",
        port: null,
        path:
          "/v3/places/search?ll=" +
          latitude +
          "%2C" +
          longitude +
          "&radius=100000&categories=15000&limit=50",
        headers: {
          accept: "application/json",
          Authorization: process.env.FOURSQUARE_AUTH,
        },
      };
      console.log("options = ", JSON.stringify(options, null, 2));

      const apiRequest = http.request(options, function (apiResponse) {
        let responseBody = "";

        apiResponse.on("data", function (chunk) {
          responseBody += chunk;
        });

        apiResponse.on("end", function () {
          try {
            const data = JSON.parse(responseBody);

            // Check if the "results" property exists in the data
            if (!data.results) {
              console.log("Results property not found in API response.");
              res.render("error", { error: "Invalid API response" });
              return;
            }

            const hospitals = data.results;
            console.log(hospitals);

            const filteredHospitals = hospitals.map((hospital) => {
              return {
                name: hospital.name,
                address: hospital.location.formatted_address,
              };
            });

            res.render("hospital", {
              hospital: filteredHospitals,
              userName: userName,
              phoneNumber: phoneNumber,
            });
          } catch (error) {
            console.log("Error parsing JSON from API response:", error);
            res.render("error", { error: "Error parsing API response" });
          }
        });
      });

      apiRequest.end();
    }

    hospitalCall();
  } catch (error) {
    console.log("An error occured: " + error);
  }
});

app.post("/hospital", (req, res) => {
  var hospitalName = req.body.hospitalName;
  var hospitalAddress = req.body.hospitalAddress;
  var userName = req.body.userName;
  var phoneNumber = req.body.phoneNumber;
  hospitallist
    .findOneAndUpdate(
      { hospitalName: hospitalName, hospitalAddress: hospitalAddress },
      {
        $push: {
          patient: {
            patientName: userName,
            patientNum: phoneNumber,
            patientStatus: "pending",
            ambuTrack: "Booking Confirmed",
          },
        },
      },
      { new: true }
    )
    .then((updatedHospital) => {
      if (!updatedHospital) {
        res.send("Hospital is not registered");
      } else {
        res.render("track", {
          userName: userName,
          phoneNumber: phoneNumber,
          hospitalName: hospitalName,
          hospitalAddress,
        });
      }
    })
    .catch((error) => {
      console.log("Error updating pending case:", error);
      res.send("Error updating pending case");
    });
});

var assigndriverName = "Not Assigned Yet";
var assigndriverNum = "Not Assigned Yet";
var assigndriverId = "Not Assigned Yet";
app.post("/track", async (req, res) => {
  var userName = req.body.userName;
  var phoneNumber = req.body.phoneNumber;
  var hospitalName = req.body.hospitalName;
  var hospitalAddress = req.body.hospitalAddress;
  var ambuTrack;
  var patientId;

  try {
    const hospital = await hospitallist.findOne({
      hospitalName: hospitalName,
      hospitalAddress: hospitalAddress,
    });

    if (!hospital) {
      console.log("Hospital not found");
    } else {
      const patient = hospital.patient.find(
        (p) => p.patientName === userName && p.patientNum === phoneNumber
      );

      if (!patient) {
        console.log("Patient not found");
      } else {
        ambuTrack = patient.ambuTrack;
        patientId = patient._id.toString();

        if (ambuTrack === "ambulance assigned") {
          const h1 = await hospitallist.findOne({
            hospitalName: hospitalName,
            hospitalAddress: hospitalAddress,
          });

          if (!h1) {
            console.log("Hospital is not found");
          } else {
            const driver = h1.driver.find((d) => d.patientAssign === patientId);

            if (!driver) {
              console.log("Driver not found");
            } else {
              assigndriverName = driver.driverName;
              assigndriverId = driver.driverId;
              assigndriverNum = driver.driverNum;
            }
          }
        }
      }
    }

    res.render("status", {
      userName: userName,
      phoneNumber: phoneNumber,
      hospitalName: hospitalName,
      hospitalAddress: hospitalAddress,
      ambuTrack: ambuTrack,
      driverName: assigndriverName,
      driverNum: assigndriverNum,
      driverId: assigndriverId,
    });
  } catch (err) {
    res.send(err);
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);

  // Redirect users to the running server (e.g., homepage or a specific route)
  console.log(`Redirecting to the running server...`);
  // You can use response.redirect() here if you want to redirect the user to a specific route
  // For example: res.redirect('/home');
});
