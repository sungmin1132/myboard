const mongoclient = require("mongodb").MongoClient;
const ObjId = require('mongodb').ObjectId;
const url =
'mongodb+srv://User:1132@atlascluster.lxv1ys9.mongodb.net/?retryWrites=true&w=majority';
let mydb;
mongoclient //mongoDB 연결
  .connect(url)
  .then((client) => {

    mydb = client.db('myboard');
    app.listen(8080, function () {
      console.log("포트 8080으로 서버 대기중 ... ");
    });
  })
  .catch((err) => {
    console.log(err);
  });

const express = require("express");
const app = express();
const sha = require('sha256'); 
const multer = require('multer'); // 파일 업로드를 위한 라이브러리
const upload = multer({dest:'upload/'}); // 파일 업로드를 위한 미들웨어

let session= require('express-session');
app.use(session({
  secret: '123jklsdkjf23',
  resave: false,
  saveUninitialized: true,
}));

let storage = multer.diskStorage({ //이미지 업로드 설정
  destination: function(req, file, done){
    done(null, './public/image');
  },
  filename: function(req, file, done){
    done(null, file.originalname);
  }
});

let upload2 = multer({storage: storage}); 




// app.get('/session', (req,res)=>{
//   if(isNaN(req.session.milk)){
//     req.session.milk =0;
//   }
//   req.session.milk = req.session.milk+1000;
//   res.send('session: '+req.session.milk+'원');
// });

app.use(express.static('public'));
//body-parser 라이브러리 추가
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended:true}));
app.set('view engine', 'ejs');

app.get("/", function (req, res) {
  mydb.collection('post').find().toArray().then(result => {
    console.log(result);
    res.render('index.ejs', { user: null, data: result });
  }).catch(err => {
    console.error(err);
    res.status(500).send("서버 오류 발생");
  });
});



app.get("/list", function (req, res) {
 if(req.session.user){
      mydb.collection('post').find().toArray().then(result => {
        console.log(result);
        res.render('list.ejs', { data : result });
      })
    }else{
      res.render('login.ejs');
    }
});

let imagepath = null;
app.post('/photo', upload2.single('picture'), function(req, res){
  console.log(req.file.path);
  imagepath = '/image/' + req.file.filename;
});

//'/enter' 요청에 대한 처리 루틴

app.get('/enter', function(req, res){ 
  if(req.session.user){
    console.log('세션 유지')
    res.render('enter.ejs');
  }else{
    res.render('login.ejs');
  } 
});



app.get('/search', function(req, res){
  console.log(req.query.value);
  mydb.collection('post').
  find({title:{$regex:req.query.value}}).toArray()
  .then(result => {
    console.log(result);
    res.render('sresult.ejs', { data : result });
  }
  );
});


app.get('/login', function(req, res){ 
  mydb.collection('post').find().toArray().then(result => {
  console.log(req.session); 
  if(req.session.user){
    console.log('세션 유지');
    res.render('index.ejs',{user:req.session.user, data: result});
  }else{
    res.render('login.ejs', {error: null});
  }  
  }
  );
});



app.get('/logout', function(req, res){ 
  mydb.collection('post').find().toArray().then(result => {
  console.log('로그아웃');
  req.session.destroy();
  res.render('index.ejs',{user:null, data: result});
  }
  );
});


// app.get("/content/:id", function (req, res) { 
//   console.log(req.params.id);
//   let new_id = new ObjId(req.params.id);

//   mydb.collection('post').findOne({ _id: new_id})
//   .then(result => {
//     console.log(result);
//     res.render('content.ejs', { data : result });
//   }).catch(err =>{
//     console.log(err);
//     res.status(500).send();
//   });
// });

app.get("/content/:id", function (req, res) { 
  const id = req.params.id;

  // ID 형식 체크
  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    console.error("Invalid ID format: ", id);
    return res.status(400).send("Invalid ID format");
  }
  try {
    let new_id = new ObjId(id);

    mydb.collection('post').findOne({ _id: new_id })
      .then(result => {
        console.log(result);
        res.render('content.ejs', { data: result });
      })
      .catch(err => {
        console.error(err);
        res.status(500).send();
      });
  } catch (error) {
    console.error("Error creating ObjectId", error);
    res.status(500).send("Server error");
  }
});

app.get("/edit/:id", function (req, res) { 
  console.log(req.params.id);
  let new_id = new ObjId(req.params.id);

  mydb.collection('post').findOne({ _id: new_id})
  .then(result => {
    console.log(result);

    if (req.session.user.userid != result.userid) {
      res.send('<script>alert("수정 권한이 없습니다."); history.back();</script>')
      .catch(err => {
        console.error(err);
        res.status(500).send();
      });
      return;
    }

    
    res.render('edit.ejs', { data : result });
  }).catch(err =>{
    console.log(err);
    res.status(500).send();
  });
});

app.post("/login", function (req, res) { 
  
  mydb.collection('account').findOne({ userid: req.body.userid })
  .then(result => {
    if (result) {
      if (result.userpw == sha(req.body.userpw)) {
        req.session.user = req.body;
        console.log('새로운 로그인');
        mydb.collection('post').find().toArray().then(posts => {
          res.render('index.ejs', { user: req.session.user, data: posts });
        });
      } else {
        // 비밀번호가 일치하지 않는 경우
        return res.send('<script>alert("비밀번호가 다릅니다"); history.back();</script>');
      }
    } else {
      // 사용자가 존재하지 않는 경우
      return res.send('<script>alert("존재하지 않는 아이디입니다"); history.back();</script>');
    }
  })
  });


//'/save' 요청에 대한 post 방식의 처리 루틴
app.post('/save', function(req, res){
  
  console.log(req.body.title);
  console.log(req.body.content);
  console.log(req.body.someDate);
  
   let sql = "insert into post (title, content, created) values(?, ?, ?)";
   let params = [req.body.title, req.body.content,req.body.someDate ];
   conn.query(sql, params, function (err, result) {
       if (err) throw err;
       console.log('데이터 추가 성공'); 
   });
  res.send('데이터 추가 성공');
});

app.post('/savemongo', upload.single('file'),function(req, res){
  console.log(req.session.user);

  console.log(req.body.title);
  console.log(req.body.content); 
  let now = new Date();

  // 파일 첨부 여부 확인
  let filePath = null;
  if (req.file && req.file.path) {
    filePath = req.file.path;
  }

  console.log(req.file);

  mydb.collection('post').insertOne({
    userid: req.session.user.userid,
    title: req.body.title,
    content: req.body.content,
    date: now.getTime(),
    path: imagepath,
    filePath: filePath
  })
  .then(result => {
    console.log(result);
    console.log('데이터 추가 성공');
  }); 

  res.redirect('/list');
});



app.get('/signup', function(req, res){ 
  res.render('signup.ejs');
});

app.post('/signup', function(req, res){
  mydb.collection('account').findOne({ userid: req.body.userid })
    .then(user => {
      if (user) {
        // 사용자명이 이미 존재하는 경우
        return res.send('<script>alert("동일한 사용자가 존재합니다"); history.back();</script>');

      } else {
        // 사용자명이 존재하지 않는 경우, 회원가입 진행
        mydb.collection('account').insertOne({
          userid: req.body.userid, 
          userpw: sha(req.body.userpw), 
          usergroup: req.body.usergroup, 
          useremail: req.body.email
        })
        .then(result => {
          console.log('회원가입 성공');
          res.redirect('/');
        });
      }
});
});


app.post("/delete", function (req, res) {
  const postId = new ObjId(req.body._id);

  mydb.collection('post').findOne({ _id: postId })
    .then(post => {
      if (!post) {
        return res.status(404).send('게시물이 존재하지 않습니다.');
      }

      // 여기서 사용자 아이디와 게시물 작성자 아이디를 비교합니다.
      if (req.session.user && req.session.user.userid === post.userid) {
        // 삭제 권한이 있을 때
        mydb.collection('post').deleteOne({ _id: postId })
          .then(() => res.status(200).send())
          .catch(err => {
            console.error(err);
            res.status(500).send();
          });
      } else {
        // 삭제 권한이 없을 때
        res.status(403).send('삭제 권한이 없습니다.');
      }
    })
    .catch(err => {
      console.error(err);
      res.status(500).send();
    });
});

app.post('/edit', function(req, res){
  console.log(req.body.title);
  console.log(req.body.content);   
  let new_id = new ObjId(req.body.id);
  mydb.collection('post').updateOne({_id:new_id},
    {$set: {title : req.body.title, content : req.body.content, date : req.body.someDate}})
    .then(result => {        
        console.log('데이터 수정 성공');
        res.redirect('/list');
    }); 
});

app.get("/userlist", function (req, res) {
  mydb.collection('account').find({}, { projection: { userid: 1, _id: 0 } }).toArray()
    .then(users => {
      res.render('userlist.ejs', { userids: users });
    })
});

app.get("/user-posts/:userid", function(req, res) {
  const userId = req.params.userid;
  mydb.collection('post').find({ userid: userId }).toArray()
    .then(posts => {
      // 'userposts.ejs'는 사용자의 게시물을 표시하는 템플릿.
      res.render('userposts.ejs', { posts: posts, userid: userId });
    })
});
