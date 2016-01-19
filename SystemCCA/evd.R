library(evd)


IsValid<-function( x, para)
{
   return (para$epsilon * (x - para$Mu) / para$Sigma > -1)

}


LRS<-function(V){
  n=length(V)
  if(n<4) stop("Need at least 4 points")
  
  X=sort(V)
  epsilon = 0
  n4 = floor(n / 4.0)
  
  for ( i in 1:n4)
  {
      a = sqrt(  log((n - i) / n) /log(i / n))
      q0 = i
      q1 = floor(n * ( i / n)^ a  )
      q2 = n - i
      r = (X[q2] - X[q1]) / (X[q1] - X[q0])
      epsilon = epsilon - log(r) / log(a)
      
  }
  
  epsilon=epsilon/n4
 # trim epsilon in [-1 -0.01]U[0.01, 2];
  
  if(epsilon>0)
     epsilon=max(0.01,min(2,epsilon))
  else
    epsilon= max(-1,min(-0.01,epsilon))
  
  dat=NULL
  # estimate scale/location from QQ-plot
  q=(1:n)/(n+1)
  y=((-log(q))^-epsilon-1)/epsilon
  dat=data.frame(y,X)
  d=floor(n/10)
  mod=lm(y~X, data=dat[d+1:(n-d),]) 
  sigma=1/mod$coef[2]
  mu=-mod$coef[1]*sigma

  list(mu=unname(mu), sigma=unname(sigma), espsilon=epsilon)
  
}


CalVaR<-function( a,  W=1,para)
{
    mu=para$mu
    sigma=para$sigma
    epsilon=para$epsilon
    return (mu + sigma / epsilon * ((-log(a)/W)^ -epsilon - 1))
}
