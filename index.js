/**
 * Simple example Node.js application to demonstrate face detection.
 */

/**
 * Define the dependencies
 */
var express   =   require( 'express' )
  , http       =    require( 'http' )
  , async     =    require( 'async' )
  , multer    =   require( 'multer' )
  , upload     =    multer( { dest: 'uploads/' } )
  , exphbs    =   require( 'express-handlebars' )
  , easyimg   =    require( 'easyimage' )
  , _         =    require( 'lodash' )
  , jimp      =    require('jimp')
  , smartCrop = require("smartcrop")
  , cv         =   require( 'opencv' );

/**
 * Create a simple hash of MIME types to file extensions
 */
var exts = {
  'image/jpeg'   :   '.jpg',
  'image/png'    :   '.png',
  'image/gif'    :   '.gif'
}

var max = 0;
var bigFace = 0;
var croppedFace = 0;
/**
 * Note that you may want to change this, depending on your setup.
 */
var port = 8080;

/**
 * Create the express app
 */
var app = express();

/**
 * Set up the public directory
 */
app.use(express.static(__dirname + '/public'))

/**
 * Set up Handlebars templating
 */
app.engine('.hbs', exphbs( { extname: '.hbs', defaultLayout: 'default' } ) );
app.set( 'view engine', '.hbs' );

/**
 * Default page; simply renders a file upload form
 */
app.get('/', function( req, res, next ) {

  return res.render('index');

});

/**
 * POST callback for the file upload form. This is where the magic happens.
 */
app.post('/upload', upload.single('file'), function(req, res, next){

  // Generate a filename; just use the one generated for us, plus the appropriate extension
  var filename = req.file.filename + exts[req.file.mimetype]
    // and source and destination filepaths
    , src = __dirname + '/' + req.file.path
    , dst = __dirname + '/public/images/' + filename;

  /**
   * Go through the various steps
   */
  async.waterfall(
    [
      function( callback ) {

        /**
         * Check the mimetype to ensure the uploaded file is an image
         */
        if (!_.contains(
          [
            'image/jpeg',
            'image/png',
            'image/gif'
          ],
          req.file.mimetype
        ) ) {

          return callback( new Error( 'Invalid file - please upload an image (.jpg, .png, .gif).' ) )

        }

        return callback();

      },
      function( callback ) {

        /**
         * Get some information about the uploaded file
         */
        easyimg.info( src ).then(

          function(file) {

            /**
             * Check that the image is suitably large
             */
            if ( ( file.width < 960 ) || ( file.height < 300 ) ) {

              return callback( new Error( 'Image must be at least 640 x 300 pixels' ) );

            }

            return callback();
          }
        );
      },
      function( callback ) {

        /**
         * Resize the image to a sensible size
         */
        easyimg.resize(
          {
            width      :   960,
            src        :   src,
            dst        :   dst
          }
        ).then(function(image) {

          return callback();

        });

      },
      function( callback ) {

        /**
         * Use OpenCV to read the (resized) image
         */
        cv.readImage( dst, callback );

      },
      function( im, callback ) {

        /**
         * Run the face detection algorithm
         */
        im.detectObject(cv.FACE_CASCADE, {}, function(err, faces) {
         if (err) throw err;
         for (var i = 0; i < faces.length; i++) {
         face = faces[i];
           if((face.height) > max ) {
            max = (face.height);
            index = i;
            bigFace = faces[index];
           }
         }
         console.log("90");
         im.ellipse(bigFace.x + bigFace.width / 2, bigFace.y + bigFace.height / 2, bigFace.width / 2, bigFace.height / 2, [0, 255, 0], 3);
         //im.save("./fullimage/fullRender.jpg");
         im.detectObject( cv.FACE_CASCADE, {}, callback );
       });
       //im.detectObject( cv.FACE_CASCADE, {}, callback );
      }


    ],
    function( err, faces ) {

      /**
       * If an error occurred somewhere along the way, render the
       * error page.
       */
      if ( err ) {

        return res.render(
          'error',
          {
            message : err.message
          }
        );
      }

      /**
       * We're all good; render the result page.
       */
       for (var i = 0; i < faces.length; i++) {
       face = faces[i];
       if((face.height) > max ) {
         max = (face.height);
         index = i;
         bigFace = faces[index];
       }
     }
     jimp.read(dst).then(function (image) {
       image.crop(bigFace.x, bigFace.y,bigFace.width, bigFace.height);
       image.write('./cropped/croppedImg2.jpg');
      }).catch(function (err) {
        console.error(err);
      });


      return res.render(
        'result',
        {
          filename   :   filename,
          faces     :   faces
        }
      );
 });
});

/**
 * Start the server
 */
http.createServer(
  app
).listen( port, function( server ) {
  console.log( 'Listening on port %d', port );
});
