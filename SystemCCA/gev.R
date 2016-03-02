library(evd)
library(plyr)
library(xts)

#Density function, distribution function, quantile function and random generation for the generalized
#dgev(x, loc=0, scale=1, shape=0, log = FALSE)--------PDF
#pgev(q, loc=0, scale=1, shape=0, lower.tail = TRUE)---CDF
#qgev(p, loc=0, scale=1, shape=0, lower.tail = TRUE)--qantile--VaR
#rgev(n, loc=0, scale=1, shape=0)-----random generation
##################################


#-----Univariate GEV-------------------------------------------------------------------------------------
IsValid<-function( x, para)
{
   return (para$epsilon * (x - para$mu) / para$sigma > -1)

}
UniMargin<-function(x,para){
  t=(x-para$mu)/para$sigma
  e=para$epsilon
  (1+e*t)^-(1/e)
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
  y=(  (-log(q))^-epsilon-1  )   /epsilon
  
  dat=data.frame(y,X)
  d=floor(n/10)
  mod=lm(X~y, data=dat[(d+1):(n-d),]) 
  list(mu=unname(mod$coef[1]), sigma=unname(mod$coef[2]), epsilon=epsilon)
  
}


CalVaR<-function( p, para,dep=1){
    mu=para$mu
    sigma=para$sigma
    epsilon=para$epsilon
    return (mu + sigma / epsilon * ((-log(p)/dep)^ -epsilon - 1))
}






#' -----------Multivariate GEV------------------------------------------------------------
#'@param  d dimensions
#'mGEV mulivariate GEV
#'

df=data.frame(USA=rnorm(100), China=rexp(100),India=rgamma(100,0.5))
as.xts(df,  order.by=seq(as.Date("2000/1/1"), by = "month", length.out = 100))->dat

mGEV=list()

multiDep<-function(Data)
{
  d=ncol(Data)
  n=nrow(Data)
 # non parameter probability
  p=apply(Data,2,rank)/(n+1)
  y=-log(p)
  w<-rep(1/d, d)
  y<-na.omit(y)
  ym<-colMeans(y)
  v<-sapply(1:d,function(i)y[,i]/ym[i]/w[i])
  res<-1/mean(apply(v,1,min))
  res<-min(1,max(res,w))
  
  
}

Estimate<-function(Data)
{
       
  #estimate marginal parameters
  #LRS estimate
  parm<-apply(Data, 2,function(x) unlist(LRS(x)))
  #MLE estimate
  #par<-fgev(Data)$estimate
  #estimate dependence
  dep=multiDep(Data)
  res=list(param=parm,dependence=dep )
  
  
}


#' ----Multivariate GEV----
#'@param  p probability 
#'@param  parameter data frame, column banks, 
#'                 row: mu, deta, epsilon
#'@param  dep multivariate dependence
#'@result Joint VaR

JointVaR<-function(p, param, dep){
  
  d=ncol(param)
  lhs=-log(p)/dep
  
  #solve
  para0=as.list(rowMeans(param))
  para1=para0
  para1=list(mu=para0$mu*d, sigma=para0$sigma*sqrt(d),  epsilon=para0$epsilon)
  x0=CalVaR(p,para1,dep)
  
  v0=UniMargin(x0,para0)
  
  
  f<-function(x){
    
         sum(apply(param,2, function(para){
              para=as.list(para)
             if(IsValid(x,para))
              UniMargin(x,para)
             else 
               v0
      
            })
             
            )-lhs

  }
  #not sure how to set up upper bound for the root range

  
  fm<-function(x)f(x)^2

  tryCatch(
    
  #find the root
  tryCatch({
    left=0; right=200*x0;
    uni<-uniroot(f,c(left,right))
    res=uni$root
  } ,
  
  #minimize the error if fail to find the root.
  warning=function(w)nlm(fm,x0)$estimate ,
  error=function(e)nlm(fm,x0)$estimate
  ),
  warning=function(w)NA,
  error=function(e)NA
  
  )
  
}



















