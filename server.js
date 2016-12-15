'use strict'

//process.env.DEBUG = 'actions-on-google:*';

let Assistant = require('actions-on-google').ActionsSdkAssistant;
let express = require('express');
let bodyParser = require('body-parser');
let request = require('request-json');

let app = express();
app.set('port', (process.env.PORT || 8000));
app.use(bodyParser.json({type: 'application/json'}));

let questionsClient = request.createClient('http://jservice.io/');

function getQuestion() {
  return new Promise(function(resolve, reject) {
    questionsClient.get('api/random', function(err, response, body) {
      if (err) throw err;

      let question = body[0];
      resolve(question);
    });
  });
}

function buildInputPromptFromQuestion(question, assistant, preamble) {
  var prompt = preamble || "";

  prompt += "From the category: " + question.category.title + ", " + question.question;

  let answerPrompt = assistant.buildInputPrompt(false,
     prompt,
    ["Didn't catch that.", "Do you have a real guess?", "Almost out of time."]
  );
  return answerPrompt;
}

app.post('/', function(req, res) {
  const assistant = new Assistant({
    request: req,
    response: res
  });

  function welcomeIntent(assistant) {
    questionIntent(assistant, "This. Is. Jeopardy. ");
  }

  function questionIntent(assistant, preamble) {
    getQuestion().then(function(question) {
      assistant.data = {
        question: question
      };
      return buildInputPromptFromQuestion(question, assistant, preamble);
    }).then(function(inputPrompt) {
      assistant.ask(inputPrompt);
    });
  }

  function answerIntent(assistant) {
    if (!assistant.data.question) {
      questionIntent(assistant, "Why don't I ask you a question. ");
    } else {

      var userAnswer = assistant.getRawInput();
      var correctAnswer = assistant.data.question.answer;

      var prompt = "";

      if (userAnswer == correctAnswer) {
        prompt += "Correct!! ";
      } else {
        prompt = "You answered: " + userAnswer + ". ";
        prompt += "The correct answer is: " + correctAnswer + ". ";
      }
      prompt += "Next question: ";

      questionIntent(assistant, prompt);
    }
  }

  assistant.handleRequest(function(assistant) {
    let intent = assistant.getIntent();
    console.log("intent: ", intent);
    switch (intent) {
      case assistant.StandardIntents.MAIN:
        welcomeIntent(assistant);
        break;

      case "ASK_QUESTION":
        questionIntent(assistant);
        break;

      case assistant.StandardIntents.TEXT:
        answerIntent(assistant);
        break;
    }
  });
});

app.get('/', function(req, res) {
  questionsClient.get('api/random', function(err, response, body) {
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(body));
  });
})

/**

*/

let server = app.listen(app.get('port'), function() {
  console.log('App listening on port %s', server.address().port);
});
