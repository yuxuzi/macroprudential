
library(rootSolve)

ExpectedLoss<-function(model,A,B,T,Ve,r, ...)
{
  vanillaOptionEuropean(A,B,T,r,q=0,V, greeks = FALSE)
  
  D=exp(-r*T)
  model<-function(x){
    d1=x[1]
    d2=x[2]
    V=(1-  B*D*pnorm(d2)/(A*pnorm(d1)) )*Ve
    F1=(log(A/B) + (r+0.5*V^2)*T)/(V*sqrt(T))-d1
    F2=d1-V*sqrt(T)-d2
    c(F1=F1,F2=F2)
  }
   solution<- multiroot(f = model, start = c(0.5, 0.4))
   if(solution$estim.precis>1e5) return (NA)
   dd1=solution$root[1]
   dd2=solution$root[2]
   loss=B*D*pnorm(-dd2)-A*pnorm(-dd1)

}


