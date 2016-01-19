#Significants levels

library(tidyr)
library(dplyr)

#roll over the window on the original data to get the extreme data.
LoopMax<-function(dat,start,Ex_win )
{
  #loop data
  colMax <- function(data) sapply(data, max, na.rm = TRUE)
  res= rollapply(dat[start:nrow(dat),],Ex_win, by=Ex_win, by.column=FALSE, colMax )
   na.omit(res)
}


#Main Calculation function

### calculate VaR first

Calculate<-function(DAT,window,step)
{
  alphas<-c(0.75, 0.80,0.85, 0.90,0.95,0.975,0.99,0.995)
  
  if(nrow(DAT)<window)
    return(NULL)
   nPeriod=floor(  (nrow(DAT)-window)/step)
   margin_records<-list()
   var_records<-NULL
   
   
  for(n in 0:nPeriod){
    dat1=DAT[n*step+(1:window),]
    date=end(dat1)
    dist<-Estimate(dat1)
    dist$date<-date
    VaRs<-sapply(alphas, JointVaR,  param=dist$param, dep=dist$dep)
    names( VaRs)<-paste0("VaR",alphas*100)
    margin_records[[n+1]]<-dist
    var_records<-rbind(var_records,  data.frame(date=date,t(VaRs)))
    
  }
                                         
 
   records<-list(VaRs=as.xts(var_records[,-1],order.by=var_records[,1]), margins=margin_records, alphas=alphas)
  
}




#Print VaR
Report_VaR<-function(Records,Significanes){
  vars<-Records$VaRs
  alphas=Records$alphas
  res<- vars[,alphas%in%Significanes]
 
  res<-apply(res,2,round,digits=3)
  res<-data.frame(date=index(vars),res)
  colnames(res)<-c("date", paste0("VaR", Significanes*100, "%"))
  res
}


#Print ES
Report_ES<-function(Records,Significanes){
  
  vars<-Records$VaRs
  alphas=Records$alphas
  
  
  CalES<-function(q,VaRs){
    p=alphas[alphas>=q]
    v=VaRs[alphas>=q]
    d=diff(c(p,1))
    res=sum(v*d)/sum(d)
    round(res,3)
    
  }
  
  res<-apply(vars,1,function(vv)sapply(Significanes, CalES,VaRs=vv ))
  if(length(Significanes)>1)
    res<- data.frame(date=index(vars), t(res))
  else
    res<- data.frame(date=index(vars), ES=res)
  
  
  
  colnames(res)<-c("date",paste0("ES",Significanes*100,"%"))
 
 res
}  
  

#Print Dependence and marginal parameters
Report_Margin<-function(Records){
 output<- function(dat){
      param=data.frame(id=rownames(dat$param),dat$param)
      parameters<- param%>%
      gather(bank,value,-id)%>%
      mutate(name=paste(bank,id, sep="_"))%>%
      select(name,value)%>%
      spread(name,value)
      data.frame(date=dat$date,dependance=round(dat$dependence,3),round(parameters,3))
  }
  
  ldply(Records$margins,output )
} 

