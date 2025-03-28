const navBar = document.querySelector('nav');
const menuBtns = document.querySelectorAll('.menu-item');
const overlay = document.querySelector('.overlay2');

const imageShapeRow = document.querySelector('#shape-row');
const imageContainer = document.querySelector('.image-container');
let shapesArray = document.querySelectorAll('.image-shape-btn:not(.active)');
let activeShape = document.querySelector('#shape-row .active');

// ************** Navigation Bar **************
menuBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
        navBar.classList.toggle('open');
    });
});

overlay.addEventListener('click', () => {
    navBar.classList.remove('open');
});


// ************** Image Shape Selection **************
imageShapeRow.addEventListener('click', (e) => {
    e.preventDefault();

    if (e.target.matches('.active') || !e.target.matches('.image-shape-btn')) {
        return;
    }

    shapesArray.forEach((shape) => {
        if (e.target === shape) {
            activeShape.classList.remove('active');
            e.target.classList.add('active');
            activeShape = e.target;
        }
    });

    imageContainer.classList.remove(`${imageContainer.classList[1]}`);
    imageContainer.classList.add(`${e.target.classList[1]}-dimensions`);

    shapesArray = document.querySelectorAll('.image-shape-btn:not(.active)');

});

// **************************** Image Slider ****************************

// --------------- setting images in image-Container ---------------
let imageCount = 4;
const imagesPath = "../images/shassani/shassani_";
const generateBtn = document.querySelector('.generate-btn');
const imageSlider = document.querySelector('.slider-wrapper .slider');
const middleItem = document.querySelector('.middle-item');
const rightArrow = document.querySelector('.right-arrow');
const leftArrow = document.querySelector('.left-arrow');
const nextBtn = document.querySelector('.next-btn');
const prevBtn = document.querySelector('.prev-btn');
const right = document.querySelector('.right');
const dotsContainer = document.querySelector('.dot-container');

function loadImages() {
    for(let i = 1; i <= imageCount; i++) {
        let img = new Image();
        img.src = `${imagesPath}${i}.jpeg`; 
        img.alt = `Image ${i}`;
        img.classList.add(`slide`);
        img.classList.add(`slide-${i}`);
        // if(i !== 1) img.classList.add('hidden');


        img.onload = () => imageSlider.appendChild(img);
        img.onerror = () => clearInterval(interval); 
    }
}

generateBtn.addEventListener('click', () => {
    setTimeout(() => {
        loadImages();
        createDots();
        middleItem.classList.add('hidden');

        if(imageCount > 1) {
            rightArrow.classList.remove('hidden');
            nextBtn.classList.remove('hidden');
        }

    }, 3000);
});



function createDots() {
    for(let i = 0; i < imageCount; i++) {
        let dot = document.createElement('span');

        if(i === 0)
            dot.classList.add('dot', `dot-${i+1}`, 'active');
        else
            dot.classList.add('dot', `dot-${i+1}`);
        dotsContainer.appendChild(dot);
    }
    dotsContainer.classList.remove('hidden');
}


// Slider functionality
let currentIndex = 0;

function checkCurrentElement(ele) {
    return ele.closest('.right-arrow') 
            || ele.matches('.next-btn')
            || ele.closest('.left-arrow') 
            || ele.matches('.prev-btn')
            || ele.matches('.dot')
}

function slideNext(e) {
    e.preventDefault();

    const currentElement = e.target;

    if(!currentElement.closest('.right-arrow') && !currentElement.closest('.next-btn')) {
        return;
    }

    const lastImage = document.querySelector(`.slide-${currentIndex+1}`);
    // lastImage.classList.add('hidden');

    const lastDot = document.querySelector(`.dot-${currentIndex+1}`).classList.remove("active");
    


    currentIndex = (currentIndex + 1) % imageCount;

    const currImage = document.querySelector(`.slide-${currentIndex+1}`);
    // currImage.classList.remove('hidden');

    if(currentIndex === imageCount - 1) {
        rightArrow.classList.add('hidden');
        nextBtn.classList.add('hidden');
    }

    if(currentIndex === 1) {
        leftArrow.classList.remove('hidden');
        prevBtn.classList.remove('hidden');
    }

    document.querySelector(`.dot-${currentIndex+1}`).classList.add("active");
    updateSlider();

}

function slidePrev(e) {

    const currentElement = e.target;

    if(!currentElement.closest('.left-arrow') && !currentElement.closest('.prev-btn')) {
        return;
    }

    const lastImage = document.querySelector(`.slide-${currentIndex+1}`);
    // lastImage.classList.add('hidden');

    document.querySelector(`.dot-${currentIndex+1}`).classList.remove("active");

    currentIndex = (currentIndex - 1 + imageCount) % imageCount;

    const currImage = document.querySelector(`.slide-${currentIndex+1}`);
    // currImage.classList.remove('hidden');

    if(currentIndex ===  0) {
        leftArrow.classList.add('hidden');
        prevBtn.classList.add('hidden');
    }

    if(currentIndex < imageCount - 1) {
        rightArrow.classList.remove('hidden');
        nextBtn.classList.remove('hidden');
    }

    document.querySelector(`.dot-${currentIndex+1}`).classList.add("active");

    updateSlider();
}

function updateSlider() {
    const offset = -currentIndex * 100;
    imageSlider.style.transform = `translateX(${offset}%)`;
}

right.addEventListener('click', slideNext);
right.addEventListener('click', slidePrev);



