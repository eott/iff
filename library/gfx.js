var explosionGroup;
var explosions = [];

var endScreen;
var titleScreen;
var tutorialOne;
var tutorialTwo;
var tutorialSlide = 1;

var scoreText;

function gfxPreload() {
    game.load.spritesheet('explosion', 'assets/images/mobs/explosion_spritesheet.png', 64, 64);
    game.load.image('splash', 'assets/images/menu/splash_screen.png');
    game.load.image('end-screen', 'assets/images/menu/end_screen.png');
    game.load.image('tutorial-1', 'assets/images/menu/tutorial_1.png');
    game.load.image('tutorial-2', 'assets/images/menu/tutorial_2.png');
}

function gfxCreate() {
    explosionGroup = game.add.group();

    titleScreen = game.add.sprite(1200, 900, 'splash');
    endScreen = game.add.sprite(1200, 900, 'end-screen');
    tutorialOne = game.add.sprite(1200, 900, 'tutorial-1');
    tutorialTwo = game.add.sprite(1200, 900, 'tutorial-2');
    endScreen.visible = false;
    tutorialOne.visible = false;
    tutorialTwo.visible = false;

    scoreText = document.getElementById('scoreText');
    scoreText.style.display = 'none';
}

function gfxUpdate() {
    for (var i = 0; i < explosions.length; i++) {
        if (explosions[i].animations.getAnimation('e').isFinished) {
            explosions[i].kill();
            explosions.splice(i, 1);
        }
    }

    var deg       = Math.round((180 - 180 * (player.health / playerMaxHealth)));
    var healthbar = document.getElementById('healthbarBarImage');
    healthbar.style.webkitTransform = 'rotate(-'+ deg +'deg)'; 
    healthbar.style.mozTransform    = 'rotate(-'+ deg +'deg)'; 
    healthbar.style.msTransform     = 'rotate(-'+ deg +'deg)'; 
    healthbar.style.oTransform      = 'rotate(-'+ deg +'deg)'; 
    healthbar.style.transform       = 'rotate(-'+ deg +'deg)';

    var slots = document.getElementById('conversionSlots');
    switch (enemiesConverted) {
        case 1: slots.style.backgroundPosition = '0 -128px'; break;
        case 2: slots.style.backgroundPosition = '0 -256px'; break;
        case 3: slots.style.backgroundPosition = '0 -382px'; break;
        case 0: 
        default:
            slots.style.backgroundPosition = '0 0';
            break;
    }

    scoreText.textContent = 'Score: ' + score;
}

function createExplosion(x, y) {
    var explosion = explosionGroup.create(x, y, 'explosion');
    explosion.frame = 0;
    explosion.animations.add('e');
    explosion.animations.play('e', 50, false);
    explosions.push(explosion);
    return explosion;
}

function advanceMenu() {
    switch (tutorialSlide) {
        case 1:
            titleScreen.visible = false;
            tutorialOne.visible = true;
            break;
        case 2:
            tutorialOne.visible = false;
            tutorialTwo.visible = true;
            break;
        case 3:
            tutorialTwo.visible = false;
            showMainGame();
            playAudio('backgroundMusic');
    }
    tutorialSlide++;
}

function showEndscreen() {
    endScreen.x = player.body.x - 384;
    endScreen.y = player.body.y - 284;
    endScreen.visible = true;
    document.getElementById('healthbarBackground').style.display = 'none';
    document.getElementById('healthbarBar').style.display = 'none';
    document.getElementById('conversionSlots').style.display = 'none';
}

function showMainGame() {
    endScreen.visible = false;
    scoreText.style.display = 'inherit';
    document.getElementById('healthbarBackground').style.display = 'inherit';
    document.getElementById('healthbarBar').style.display = 'inherit';
    document.getElementById('conversionSlots').style.display = 'inherit';
}