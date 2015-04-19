// Game related objects
var game = new Phaser.Game(800, 600, Phaser.AUTO, 'gameView', { preload: preload, create: create, update: update });
var cursors;
var buttonWasDown = false;

// Meta globals
var playerSpeed = 150;
var enemySpeed = 130;
var bulletSpeedFast = 200;
var bulletSpeedSlow = 120;
var starSpeed = 200;
var playerMaxHealth = 150;
var playerRegen = 1;
var isTutorial = true;
var isEndScreen = false;
var enemiesConverted = 0;
var ENEMY_TYPE_BRUTE = 0;
var ENEMY_TYPE_MOOK = 1;
var ENEMY_TYPE_HEAVY = 2;
var timeOfStart = Date.now();
var score = 0;

// Sprites
var player;
var boxGroup;
var bulletGroup;
var enemyGroup;
var starGroup;
var enemies = [];
var bullets = [];

function preload() {
    game.load.image('background', 'assets/images/background/background.png');
    game.load.image('player', 'assets/images/player/player.png');
    game.load.image('box', 'assets/images/structures/box.png');
    game.load.spritesheet('enemy', 'assets/images/mobs/enemy_spritesheet.png', 64, 64);
    game.load.spritesheet('bullet', 'assets/images/mobs/bullet_spritesheet.png', 32, 32);
    game.load.spritesheet('star', 'assets/images/player/star_spritesheet.png', 32, 32);

    gfxPreload();
    sfxPreload();
}

function create() {
    // Load sprites
    for (var i = 0; i < 4; i++) {
        for (var j = 0; j < 4; j++) {
            game.add.sprite(800 * i, 600 * j, 'background');
        }
    }

    player = game.add.sprite(1600, 1200, 'player');
    player.anchor.setTo(0.5, 0.5);
    player.scale.setTo(0.5, 0.5);
    player.health = 150;

    // Init inputs
    cursors = game.input.keyboard.createCursorKeys();
    game.canvas.oncontextmenu = function (e) {
        e.preventDefault();
    }

    // Camera and game world
    game.camera.follow(player);
    game.world.setBounds(0, 0, 3200, 2400);

    // Prepare enemies, bullets and explosions
    enemyGroup = game.add.group();
    enemyGroup.enableBody = true;

    bulletGroup = game.add.group();
    bulletGroup.enableBody = true;

    friendlyBulletGroup = game.add.group();
    friendlyBulletGroup.enableBody = true;

    starGroup = game.add.group();
    starGroup.enableBody = true;

    // Place boxes in the world
    boxGroup = game.add.group();
    boxGroup.enableBody = true;

    for (var i = 0; i < 50; i++) {
        for (var j = 0; j < 37; j++) {
            if (Math.random() < 0.1) {
                var box = boxGroup.create(i * 64, j * 64, 'box');
                box.body.immovable = true;
            }
        }
    }

    // How about some physics?
    game.physics.arcade.enable(player);
    player.body.collideWorldBounds = true;

    gfxCreate();
    sfxCreate();
}

function update() {
    // Custom click event, because why the hell has Phaser these not by default?
    if (
        game.input.mousePointer.isDown
        && !buttonWasDown
    ) {
        onMouseClick();
    }
    buttonWasDown = game.input.mousePointer.isDown;

    if (isTutorial) {
        isTutorial = tutorialSlide <= 3;
        return;
    } else if (isEndScreen) {
        if (game.input.mousePointer.isDown) {
            reset();
        }
        return;
    }

    game.physics.arcade.collide(player, boxGroup);
    game.physics.arcade.overlap(player, bulletGroup, bulletHit, null, this);

    if (player.health <= 0) {
        isEndScreen = true;
        player.body.velocity.x = 0;
        player.body.velocity.y = 0;
        showEndscreen();
        playAudio('death');
        return;
    }
    player.health += playerRegen;
    player.health = Math.min(player.health, playerMaxHealth);

    player.body.velocity.x = 0;
    player.body.velocity.y = 0;

    if (cursors.left.isDown)
    {
        player.body.velocity.x -= playerSpeed;
    }

    if (cursors.right.isDown)
    {
        player.body.velocity.x += playerSpeed;
    }

    if (cursors.up.isDown)
    {
        player.body.velocity.y -= playerSpeed;
    }

    if (cursors.down.isDown)
    {
        player.body.velocity.y += playerSpeed;
    }

    // Slow down diagonal movement to playerSpeed
    if (
        player.body.velocity.y != 0
        && player.body.velocity.x != 0
    ) {
        player.body.velocity.y /= Math.sqrt(2);
        player.body.velocity.x /= Math.sqrt(2);
    }

    // Turn the player towards the mouse cursor, minus 90° due to initial
    // image rotation
    player.rotation = game.physics.arcade.angleToPointer(player) - Math.PI * 0.5;

    // Spawn enemies
    if (
        enemies.length <= 25
        && Math.random() < 0.005 * ((enemiesConverted + 1) * 0.5) * (0.2 * Math.log(Date.now() - timeOfStart))
    ) {
        var x = Math.min(Math.max(player.body.x + Math.random() * 1600 - 800, 0), 3200);
        var y = Math.min(Math.max(player.body.y + Math.random() * 1200 - 600, 0), 2400);
        var enemy = enemyGroup.create(x, y, 'enemy');
        enemy.scale.setTo(0.5, 0.5);

        enemy.enemyType = Math.floor(Math.random() * 3);
        enemy.frame = enemy.enemyType;
        enemy.jitterCooldown = 0;
        enemy.fireCooldown = 0;
        enemy.isConverted = false;
        enemy.health = 150;
        enemy.targetedEnemy = acquireTarget(self);

        enemies.push(enemy);
    }

    for (var i = 0; i < enemies.length; i++) {
        game.physics.arcade.collide(enemies[i], boxGroup);
        game.physics.arcade.overlap(enemies[i], starGroup, bulletHit, null, this);

        if (enemies[i].isConverted) {
            game.physics.arcade.overlap(enemies[i], bulletGroup, bulletHit, null, this);
        } else {
            game.physics.arcade.overlap(enemies[i], friendlyBulletGroup, bulletHit, null, this);
        }

        if (enemies[i].health <= 0) {
            if (enemies[i].isConverted) {
                enemiesConverted--;
            }
            enemies[i].kill();
            enemies.splice(i, 1);
            score += 10;
            playAudio('death');
            continue;
        }

        if (
            !enemies[i].targetedEnemy
            || !enemies[i].targetedEnemy.alive
        ) {
            enemies[i].targetedEnemy = acquireTarget(enemies[i]);
            if (!enemies[i].targetedEnemy) {
                continue;
            }
        }

        var distance = this.game.physics.arcade.distanceBetween(enemies[i], enemies[i].targetedEnemy);

        switch (enemies[i].enemyType) {
            case 0:
                if (distance > 320){
                    game.physics.arcade.moveToObject(enemies[i], enemies[i].targetedEnemy, enemySpeed);
                } else if (distance < 300) {
                    if (enemies[i].jitterCooldown == 10) {
                        enemies[i].body.velocity.x = (Math.random() * 10) - 5;
                        enemies[i].body.velocity.y = (Math.random() * 10) - 5;
                        enemies[i].jitterCooldown = 0;
                    } else {
                        enemies[i].jitterCooldown++;
                    }
                }

                if (enemies[i].fireCooldown == 50) {
                    if (enemies[i].isConverted) {
                        var bullet = friendlyBulletGroup.create(enemies[i].body.x, enemies[i].body.y, 'bullet');
                    } else {
                        var bullet = bulletGroup.create(enemies[i].body.x, enemies[i].body.y, 'bullet');
                    }

                    game.physics.arcade.moveToObject(bullet, enemies[i].targetedEnemy, bulletSpeedFast);
                    bullet.outOfBoundsKill = true;
                    bullet.checkWorldBounds = true;
                    bullet.damage = 20;
                    bullet.isConverted = enemies[i].isConverted;

                    bullets.push(bullet);
                    enemies[i].fireCooldown = 0;
                } else {
                    enemies[i].fireCooldown++;
                }

                break;

            case 1:
                if (distance > 15){
                    game.physics.arcade.moveToObject(enemies[i], enemies[i].targetedEnemy, enemySpeed);
                } else {
                    if (enemies[i].jitterCooldown == 10) {
                        enemies[i].body.velocity.x = (Math.random() * 10) - 5;
                        enemies[i].body.velocity.y = (Math.random() * 10) - 5;
                        enemies[i].jitterCooldown = 0;
                    } else {
                        enemies[i].jitterCooldown++;
                    }
                }

                if (enemies[i].fireCooldown == 70) {
                    createExplosion(enemies[i].body.x, enemies[i].body.y);
                    if (distance < 64) {
                        enemies[i].targetedEnemy.health -= 35;
                        playAudio('hit');
                    }
                    enemies[i].fireCooldown = 0;
                } else {
                    enemies[i].fireCooldown++;
                }

                break;

            case 2:
                if (distance > 200){
                    game.physics.arcade.moveToObject(enemies[i], enemies[i].targetedEnemy, enemySpeed);
                } else if (distance < 180) {
                    if (enemies[i].jitterCooldown == 10) {
                        enemies[i].body.velocity.x = (Math.random() * 10) - 5;
                        enemies[i].body.velocity.y = (Math.random() * 10) - 5;
                        enemies[i].jitterCooldown = 0;
                    } else {
                        enemies[i].jitterCooldown++;
                    }
                }

                if (enemies[i].fireCooldown == 120) {
                    if (enemies[i].isConverted) {
                        var bullet = friendlyBulletGroup.create(enemies[i].body.x, enemies[i].body.y, 'bullet');
                    } else {
                        var bullet = bulletGroup.create(enemies[i].body.x, enemies[i].body.y, 'bullet');
                    }

                    game.physics.arcade.moveToObject(bullet, enemies[i].targetedEnemy, bulletSpeedSlow);
                    bullet.outOfBoundsKill = true;
                    bullet.checkWorldBounds = true;
                    bullet.frame = 1;
                    bullet.damage = 40;
                    bullet.isConverted = enemies[i].isConverted;

                    bullets.push(bullet);
                    enemies[i].fireCooldown = 0;
                } else {
                    enemies[i].fireCooldown++;
                }

                break;
        }
    }

    for (var i = 0; i < bullets.length; i++) {
        if (!bullets[i].alive) {
            bullets.splice(i, 1);
        }
    }

    gfxUpdate();
    sfxUpdate();
}

function onMouseClick() {
    if (isTutorial) {
        advanceMenu();
    } else {
        var star = starGroup.create(player.body.x, player.body.y, 'star');
        game.physics.arcade.moveToPointer(star, starSpeed);
        star.outOfBoundsKill = true;
        star.checkWorldBounds = true;
        star.animations.add('s');
        star.animations.play('s', 150, true);
        bullets.push(star);
    }
}

function bulletHit(object, bullet) {
    if (bullet.key == 'star') {
        if (object.key == 'enemy') {
            if (object.isConverted) {
                enemiesConverted--;
                object.isConverted = false;
                object.frame = (object.frame + 3) % 6;
                object.targetedEnemy = acquireTarget(object);
            } else if (enemiesConverted < 3) {
                enemiesConverted++;
                object.isConverted = true;
                object.frame = (object.frame + 3) % 6;
                object.targetedEnemy = acquireTarget(object);
                playAudio('convert');
            }
        }
    } else if (bullet.key == 'bullet') {
        if (
            (
                object.key == 'player'
                && !bullet.isConverted
            )
            || (
                object.key == 'enemy'
                && object.isConverted != bullet.isConverted
            )
        ) {
            object.health -= bullet.damage;
            playAudio('hit');
        }
    }

    bullet.kill();
    var index = bullets.indexOf(bullet);
    if (index >= 0) {
        bullets.splice(index, 1);
    }
}

function reset() {
    isTutorial = false;
    isEndScreen = false;
    score = 0;
    timeOfStart = Date.now();
    player.body.x = 1600;
    player.body.y = 1200;
    player.body.velocity.x = 0;
    player.body.velocity.y = 0;
    for (var i = 0; i < bullets.length; i++) {
        bullets[i].kill();
    }
    bullets = [];
    for (var i = 0; i < enemies.length; i++) {
        enemies[i].kill();
    }
    enemies = [];
    enemiesConverted = 0;
    player.health = playerMaxHealth;
    showMainGame();
}

//+ Jonas Raoni Soares Silva
//@ http://jsfromhell.com/array/shuffle [v1.0]
function shuffle(o){ //v1.0
    for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
    return o;
};

function acquireTarget(self) {
    var target = false;
    shuffle(enemies);

    for (var i = 0; i < enemies.length; i++) {
        if (self.isConverted != enemies[i].isConverted) {
            target = enemies[i];
            if (!self.isConverted && Math.random() < 0.5) {
                target = player;
            }
        }
    }

    if (!target && !self.isConverted) {
        return player;
    }

    return target;
}