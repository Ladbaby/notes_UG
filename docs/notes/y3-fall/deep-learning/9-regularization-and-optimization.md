## Regularization

regularization
: It is a Techniques for combating overfitting and improving training.

### Data Augmentation

data augmentation
: techniques used to increase the amount of data by adding slightly modified copies of already existing data or newly created synthetic data from existing data

对于CV这一块来说，具体的做法有：
- rotation
- flip
- zoom in/out
- shift
- noise

### Dropout

[https://medium.com/@amarbudhiraja/https-medium-com-amarbudhiraja-learning-less-to-learn-better-dropout-in-deep-machine-learning-74334da4bfc5](https://medium.com/@amarbudhiraja/https-medium-com-amarbudhiraja-learning-less-to-learn-better-dropout-in-deep-machine-learning-74334da4bfc5)

dropout
: ==ignoring neurons== during the training phase of certain set of neurons which is chosen at random. These units are not considered during a particular forward or backward pass.

More technically, At each training stage, individual nodes are either dropped out of the net with probability $1-p$ or kept with probability $p$, so that a reduced network is left; incoming and outgoing edges to a dropped-out node are also removed.



### Early Stopping


### Ensembling

### Injecting Noise

### L1 Regularization

### L2 Regularization
