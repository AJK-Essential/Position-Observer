# Position Observer

This is an attempt to create an observer in JS to observe position changes of a target element.

Traditionally we use methods like listening to scroll events or using continuous polling which 
results in poor performance.

This method uses an IntersectionObserver to observe changes in position of an object when it changes
