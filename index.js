const express = require("express");
const PORT = process.env.PORT || 5000;
const http = require("https");
const cors = require("cors")
const app = express();

const dotenv = require('dotenv');
dotenv.config();
const TMDB_API_KEY = process.env.TMDB_API_KEY
const RAPID_API_KEY = process.env.TMDB_API_KEY
const RAPID_API_HOST = process.env.RAPID_API_HOST

app
  .use(cors())

process.on("unhandledRejection", (reason, p) => {
  console.log("Unhandled Rejection at: Promise", p, "reason:", reason);
});

app.get("/", (req, res) => {
  res.send("Flixplore - API");
});

function stripEmptyString(value) {
  return value.length == 1 ? "" : value
}

function discoverMovies(language, year, genre, page) {
  page = typeof page === "number" ? page : 1
  return new Promise((resolve, reject) => {
    const destURL = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&sort_by=popularity.desc&include_video=false&with_original_language=${stripEmptyString(language)}&primary_release_year=${stripEmptyString(year)}&with_genres=${stripEmptyString(genre)}&page=${page}`;
    http.get(destURL, (msg) => {
      var resp = ""
      msg.on("data", (chunk) => {
        resp += chunk.toString()
      });
      msg.on("end", () => {
        try {
          const mdbList = JSON.parse(resp);
          console.log(mdbList.results[0])
          if (mdbList.total_results >= 1) {
            resolve(mdbList);
          } else {
            reject({
              status: 404,
              msg: "No movies matching your filter can be found",
            });
          }
        } catch (e) {
          console.log(e)
          reject({
            status: 500,
            msg: "Something went wrong. Please try again",
          });
        }
      })
      msg.on("error", (err) => {
        reject({
          status: 500,
          msg: "Something went wrong. Please try again",
        });
      });
    });
  });
}

function getMovieWatchLocations(movieID) {
  const options = {
    "method": "GET",
    "hostname": RAPID_API_HOST,
    "port": null,
    "path": `/idlookup?source_id=${movieID}&source=tmdb&country=us`,
    "headers": {
      "x-rapidapi-key": RAPID_API_KEY,
      "x-rapidapi-host": RAPID_API_HOST,
      "useQueryString": true
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, function (res) {
      const chunks = [];

      res.on("data", function (chunk) {
        chunks.push(chunk);
      });

      res.on("end", function () {
        try {
          const body = Buffer.concat(chunks);
          const json = JSON.parse(body.toString())
          resolve(json)
        } catch (e) {
          console.log(e)
          reject({
            status: 500,
            msg: "Something went wrong. Please try again",
          });
        }
      });
    });
    req.end();
  })
}

app.get("/random/list", (req, res) => {
  discoverMovies(req.query.language, req.query.year, req.query.genre, req.query.page)
    .then(movieList => {
      const totalPages = movieList.total_pages;
      const randomPage = Math.floor(getRandomInt(1, totalPages)) || 1
      discoverMovies(
        req.query.language,
        req.query.year,
        req.query.genre,
        randomPage
      ).then(movieList => {
        res.send({
          status: 200,
          data: movieList,
        })
      }).catch(err => {
        res.send(err)
      })
    }).catch(err => {
      res.send(err)
    })
})

app.get('/watch-locations', (req, res) => {
  getMovieWatchLocations(req.query.movieID).then(movieData => {
    res.send({
      status: 200,
      data: movieData
    })
  }).catch(e => {
    res.send(e)
  })
})

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min) + min);
}
